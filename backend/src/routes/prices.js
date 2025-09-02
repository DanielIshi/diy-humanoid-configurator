import { Router } from 'express';

const router = Router();

router.get('/', (req, res) => {
  const q = req.query.q || '';
  // Stubbed response; real impl. will query vendor APIs or scrape
  res.json({ query: q, offers: [] });
});

export default router;

