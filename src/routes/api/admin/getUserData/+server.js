import { PrismaClient } from '@prisma/client';
import { json } from '@sveltejs/kit';

import { isUserOwner } from '$lib/auth.js';

const prisma = new PrismaClient();

export async function POST( {request, cookies} ) {
  try {
    if (!(await isUserOwner(cookies.get('token')))) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    const { username } = data;

    let user = await prisma.users.findFirst({
        where: {
            name: username,
        },
    });

    if (!user) {
        return json({ error: 'User not found' }, { status: 404 });
    }

    return json({ user });
  } catch (error) {
    console.error('Error updaing user data:', error);
    return json({ error: 'Error updaing user data' }, { status: 500 });
  }
}
