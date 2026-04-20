import { z } from 'zod'
import { proofOfSqlResultSchema } from './proof-of-sql-result-schema/proof-of-sql-result-schema'

const proofOfSqlSchema = z.object({
	verify: z
		.function()
		.args(z.string(), z.array(z.string()))
		.returns(z.string().transform((val) => proofOfSqlResultSchema.parse(JSON.parse(val)))),
})

export type ProofOfSqlResult = z.infer<typeof proofOfSqlSchema>

declare global {
	// eslint-disable-next-line no-var
	var proofOfSql: ProofOfSqlResult
}

const obj = (globalThis as Record<string, unknown>)['proofOfSql']
export const proofOfSql = () => proofOfSqlSchema.parse(obj)
export { getAccessToken, submitZkQuery } from './confidential-zk-query-client/confidential-zk-query-client'
export { ZkQueryClientConfig } from './confidential-zk-query-client/zk-query-client-config'
