import { CronCapability, handler, Runner, type Runtime } from '@chainlink/cre-sdk'
import { z } from 'zod'
import { proofOfSql } from 'sxt-proof-of-sql-cre-sdk-typescript'
import input from '../../test_assets/valid_gateway_response.json' with { type: 'json' };

const configSchema = z.object({
	schedule: z.string(),
	validAttestors: z.array(z.string()),
})

type Config = z.infer<typeof configSchema>

const onCronTrigger = (runtime: Runtime<Config>) => {
	const inputString = JSON.stringify(input);
	const proofPlan = "0x0000000000000001000000000000000f455448455245554d2e424c4f434b5300000000000000010000000000000000000000000000000c424c4f434b5f4e554d424552000000050000000000000002000000000000000c424c4f434b5f4e554d424552000000000000000c7265636f72645f636f756e74000000030000000400000003000000090000000200000000000000000000000000000001000000000000000000000000000000010000000000000000000000000000000100000000010000000000000000000000000000000131000000000000000200000000000000000000000000000000000000000000000100000000000000000100000000000000010000000000000002000000000000000000000000000000000000000000000001";
	const result = proofOfSql(configSchema.parse(runtime.config).validAttestors).verify(inputString, proofPlan);
	switch (result.verificationStatus) {
    case "Failure":
      return `SQL Proof Verification Failed: ${result.error}`;
    case "Success":
      runtime.log(`SQL Proof Verification Succeeded`);
  }
  return result.verificationStatus
}

const initWorkflow = (config: Config) => {
	const cron = new CronCapability()
	return [handler(cron.trigger({ schedule: config.schedule }), onCronTrigger)]
}

export async function main() {
	const runner = await Runner.newRunner<Config>({ configSchema })
	await runner.run(initWorkflow)
}
