import type { NextApiRequest, NextApiResponse } from 'next';
import { logout } from '../../../lib/UserController';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    return logout(req, res);
  }
  res.status(405).json({ error: 'Method not allowed' });
}
