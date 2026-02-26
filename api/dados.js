export default async function handler(req, res) {
  const { page = 1, limit = 500 } = req.query;

  const url = `https://script.google.com/macros/s/AKfycbzrkyGBdn7WGN7yH-Y1IswgW6B5heRD8khBkCNjEGTHiDUR6lDcTCGr3fDaNurXyMkB/exec?page=${page}&limit=${limit}`;

  const response = await fetch(url);
  const data = await response.json();

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.json(data);
}
