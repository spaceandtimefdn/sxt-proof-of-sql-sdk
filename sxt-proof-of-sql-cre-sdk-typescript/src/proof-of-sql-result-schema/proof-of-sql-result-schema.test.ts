import { proofOfSqlResultSchema } from './proof-of-sql-result-schema';
import result from '../../../test_assets/javascript_friendly_success.json';
import failures from '../../../test_assets/javascript_friendly_failures.json';
import { z } from 'zod'

test('proof of sql parse successful result', () => {
  proofOfSqlResultSchema.parse(result);
  expect(result.verificationStatus).toBe("Success");
  z.array(proofOfSqlResultSchema).parse(failures);
  for (const failure of failures) {
    expect(failure.verificationStatus).toBe("Failure");
    expect(failure.error).toBeDefined();
    expect(failure.message).toBeDefined();
  }
});