import { z } from 'zod'
import { proofOfSqlResultSchema } from './proof-of-sql-result-schema/proof-of-sql-result-schema'

const verifyingConfigurationSchema = z.object({
	proofPlan: z.string(),
	validAttestors: z.array(z.string()),
})

const proofOfSqlSchema = z.object({
	verify: z
		.function()
		.args(z.string(), z.string())
		.returns(z.string().transform((val) => proofOfSqlResultSchema.parse(JSON.parse(val)))),
})

const proofOfSqlInternalSchema = z.object({
	verify: z
		.function()
		.args(z.string(), verifyingConfigurationSchema.transform((val) => JSON.stringify(val)))
		.returns(z.string()),
})

export type ProofOfSqlResult = z.infer<typeof proofOfSqlSchema>

declare global {
	// eslint-disable-next-line no-var
	var proofOfSql: ProofOfSqlResult
}

const obj = (globalThis as Record<string, unknown>)['proofOfSql']

const innerProofOfSql = proofOfSqlInternalSchema.parse(obj)

export const proofOfSql = (validAttestors: string[]): ProofOfSqlResult => {
	const returnValue = {
		verify: (result: string, proofPlan: string): string => {
			const verifyingConfiguration = {
				proofPlan,
				validAttestors,
			}
			return innerProofOfSql.verify(result, verifyingConfiguration)
		}
	}
	return proofOfSqlSchema.parse(returnValue);
}
