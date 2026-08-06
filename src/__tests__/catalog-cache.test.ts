import { Prisma } from '@prisma/client';
import { serializeCoursePrice } from '@/lib/lms/catalog-serialization';

describe('catalog cache serialization', () => {
  it('keeps course prices stable across a JSON cache round trip', () => {
    const cachedCourse = JSON.parse(
      JSON.stringify({
        priceEGP: serializeCoursePrice(new Prisma.Decimal('1250')),
        priceUSD: serializeCoursePrice(new Prisma.Decimal('24.5')),
      }),
    ) as { priceEGP: string; priceUSD: string };

    expect(cachedCourse).toEqual({
      priceEGP: '1250.00',
      priceUSD: '24.50',
    });
  });
});
