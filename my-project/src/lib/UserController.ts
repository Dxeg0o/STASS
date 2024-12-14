import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/user';
import type { NextApiRequest, NextApiResponse } from 'next';
import { setCookie, deleteCookie } from 'cookies-next';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export const signup = async (req: NextApiRequest, res: NextApiResponse) => {
  const { name, email, password, companyId } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ name, email, password: hashedPassword, companyId });
    await user.save();
    res.status(201).json({ message: 'User created successfully' });
  } catch (error) {
    console.error('Error during signup:', error);
    res.status(400).json({ error: 'Error creating user' });
  }
};

export const login = async (req: NextApiRequest, res: NextApiResponse) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: user._id, companyId: user.companyId }, JWT_SECRET, {
      expiresIn: '1h',
    });

    // Set the cookie using cookies-next
    setCookie('token', token, {
      req,
      res,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 3600, // 1 hour
      sameSite: 'strict',
    });

    res.status(200).json({ message: 'Login successful' });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(400).json({ error: 'Login failed' });
  }
};

export const logout = async (req: NextApiRequest, res: NextApiResponse) => {
  // Clear the cookie using cookies-next
  deleteCookie('token', { req, res });
  res.status(200).json({ message: 'Logged out successfully' });
};
