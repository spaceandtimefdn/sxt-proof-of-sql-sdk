import { z } from 'zod'

const numberColumnSchema = z.array(z.number())
const bigintColumnSchema = z.array(z.string().transform((val) => BigInt(val)))
const errorMessageVariants = z.enum(["QueryResultsDeserialization", "AttestorDeserialization", "VerificationError", "TypeConversion", "Serialization"])
const timeUnitSchema = z.union([
    z.literal('Second'),
    z.literal('Millisecond'),
    z.literal('Microsecond'),
    z.literal('Nanosecond'),
])
const columnSchema = z.discriminatedUnion('type', [
    z.object({ type: z.literal('Boolean'), column: z.array(z.boolean()) }),
    z.object({ type: z.literal('TinyInt'), column: numberColumnSchema }),
    z.object({ type: z.literal('SmallInt'), column: numberColumnSchema }),
    z.object({ type: z.literal('Int'), column: numberColumnSchema }),
    z.object({ type: z.literal('BigInt'), column: bigintColumnSchema }),
    z.object({ type: z.literal('VarChar'), column: z.array(z.string()) }),
    z.object({
        type: z.literal('Decimal75'),
        precision: z.number(),
        scale: z.number(),
        column: bigintColumnSchema,
    }),
    z.object({
        type: z.literal('TimestampTZ'),
        timeUnit: timeUnitSchema,
        offset: z.number(),
        column: bigintColumnSchema,
    }),
    z.object({
        type: z.literal('VarBinary'),
        column: z.array(
            z.array(
                z
                    .number()
                    .min(0)
                    .max(255)
                    .transform((byteArray) => new Uint8Array(byteArray)),
            ),
        ),
    }),
    z.object({ type: z.literal('Scalar'), column: bigintColumnSchema }),
])
export const proofOfSqlResultSchema = z.discriminatedUnion('verificationStatus', [
    z.object({
        verificationStatus: z.literal('Success'),
        result: z.record(
            z.string(),
            columnSchema,
        ),
    }),
    z.object({ verificationStatus: z.literal('Failure'), error: errorMessageVariants, message: z.string() }),
])