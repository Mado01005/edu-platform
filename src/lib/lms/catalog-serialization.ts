import { Prisma } from '@prisma/client';

export function serializeCoursePrice(
  value: Prisma.Decimal | number | string,
) {
  return new Prisma.Decimal(value).toFixed(2);
}
