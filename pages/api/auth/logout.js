export default function handler(req, res) {
    if (req.method !== 'POST') {
      return res.status(405).json({ message: 'Method not allowed' });
    }
  
    // Clear the HTTP-only cookie
    res.setHeader('Set-Cookie', [
      `token=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax; ${process.env.NODE_ENV === 'production' ? 'Secure;' : ''}`
    ]);
    
    res.status(200).json({ message: 'Logout successful' });
  }