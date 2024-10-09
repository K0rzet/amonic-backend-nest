import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma.service'
import * as fs from 'fs'
import * as csv from 'fast-csv'
import * as path from 'path'

@Injectable()
export class SurveyService {
	constructor(private prisma: PrismaService) {}

	async loadCsvData(filePath: string): Promise<void> {
		const fileName = path.basename(filePath)
		const match = fileName.match(/survey_(\d{2})/)
		if (!match) {
			throw new Error('Invalid file name format. Expected survey_MM.csv')
		}

		const month = parseInt(match[1], 10)
		const year = new Date().getFullYear()

		const stream = fs.createReadStream(filePath)
		const surveys: any[] = []

		return new Promise((resolve, reject) => {
			stream
				.pipe(csv.parse({ headers: true }))
				.on('data', async row => {
					const survey = {
						departure: row['Departure'] || 'unknown',
						arrival: row['Arrival'] || 'unknown',
						age: parseInt(row['Age']) || 0,
						gender: row['Gender'] || 'unknown',
						cabinType: row['TravelClass'],
						q1: parseInt(row['Q1']),
						q2: parseInt(row['Q2']),
						q3: parseInt(row['Q3']),
						q4: parseInt(row['Q4']),
						month,
						year
					}
					surveys.push(survey)
				})
				.on('end', async () => {
					await this.prisma.survey.createMany({ data: surveys })
					resolve()
				})
				.on('error', error => reject(error))
		})
	}

	async getSurveyStats() {
		const genderStats = await this.getStatsByField('gender')

		const ageStats = await this.getStatsByField('age')

		const cabinTypeStats = await this.getStatsByField('cabinType')

		const departureStats = await this.getStatsByField('departure')

		const arrivalStats = await this.getStatsByField('arrival')

		return {
			gender: genderStats,
			age: ageStats,
			cabinType: cabinTypeStats,
			departure: departureStats,
			arrival: arrivalStats
		}
	}

	async getStatsByField(
		field: 'gender' | 'age' | 'cabinType' | 'departure' | 'arrival'
	) {
		const surveys = await this.prisma.survey.groupBy({
			by: [field],
			_sum: {
				q1: true,
				q2: true,
				q3: true,
				q4: true
			},
			_count: {
				q1: true,
				q2: true,
				q3: true,
				q4: true
			}
		})

		const result = surveys.map(group => ({
			[field]: group[field],
			q1: group._sum.q1 || 0,
			q2: group._sum.q2 || 0,
			q3: group._sum.q3 || 0,
			q4: group._sum.q4 || 0,
			count: group._count.q1 || 0
		}))

		return result
	}

	async getDetailedSurveyStats(filters: {
		month?: number;
		year?: number;
		gender?: string;
		ageGroups?: string[];
	}) {
		const categories = ['gender', 'cabinType', 'departure', 'arrival', 'ageGroup'] as const
		const questions = ['q1', 'q2', 'q3', 'q4'] as const
		const result: Record<string, any> = {}

		const whereConditions: any = {}
		if (filters.month) whereConditions.month = filters.month
		if (filters.year) whereConditions.year = filters.year
		if (filters.gender) whereConditions.gender = filters.gender

		const allSurveys = await this.prisma.survey.findMany({
			where: whereConditions
		})

		let filteredSurveys = allSurveys
		if (filters.ageGroups && filters.ageGroups.length > 0) {
			filteredSurveys = allSurveys.filter(s => filters.ageGroups.includes(this.getAgeGroup(s.age)))
		}

		for (const category of categories) {
			result[category] = {}

			let categoryValues: string[]
			if (category === 'ageGroup') {
				categoryValues = ['18-24', '25-39', '40-59', '60+']
			} else {
				categoryValues = [...new Set(filteredSurveys.map(s => s[category]))]
			}

			for (const value of categoryValues) {
				result[category][value] = {}
				let categoryFilteredSurveys: typeof filteredSurveys

				if (category === 'ageGroup') {
					categoryFilteredSurveys = filteredSurveys.filter(s => this.getAgeGroup(s.age) === value)
				} else {
					categoryFilteredSurveys = filteredSurveys.filter(s => s[category] === value)
				}

				let totalAnswers = 0
				for (const question of questions) {
					result[category][value][question] = {}
					for (let i = 1; i <= 7; i++) {
						const count = categoryFilteredSurveys.filter(s => s[question] === i).length
						result[category][value][question][i] = count
						totalAnswers += count
					}
				}
				result[category][value]['total'] = totalAnswers
			}
		}

		result['total'] = {}
		let grandTotal = 0
		for (const question of questions) {
			result['total'][question] = {}
			for (let i = 1; i <= 7; i++) {
				const count = filteredSurveys.filter(s => s[question] === i).length
				result['total'][question][i] = count
				grandTotal += count
			}
		}
		result['total']['grandTotal'] = grandTotal

		return result
	}

	private getAgeGroup(age: number): string {
		if (age >= 18 && age <= 24) return '18-24'
		if (age >= 25 && age <= 39) return '25-39'
		if (age >= 40 && age <= 59) return '40-59'
		if (age >= 60) return '60+'
		return 'Unknown'
	}
}
