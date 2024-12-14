import type { NextApiRequest, NextApiResponse } from 'next';
import { connectDB } from '../../../lib/db';
import { signup } from '../../../lib/UserController';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    await connectDB();
    return signup(req, res);
  }
  res.status(405).json({ error: 'Method not allowed' });
}
