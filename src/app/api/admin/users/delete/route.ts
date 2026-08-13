import { DELETE as deleteUsers } from '@/app/api/admin/users/route';

export const dynamic = 'force-dynamic';

export async function DELETE(request: Request) {
  return deleteUsers(request);
}
