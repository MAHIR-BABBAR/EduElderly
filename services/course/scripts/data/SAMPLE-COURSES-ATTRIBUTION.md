# Sample Courses — Attribution

Last verified: 2026-06-15

EduElderly stores **video URLs only** (YouTube or direct MP4). Each topic `contentUrl` in the database is a playable video; `sourcePageUrl` points to the original article or lesson page.

All course and video URLs live in [sample-courses.json](sample-courses.json). Rebuild the DB with `npm run seed:reset`.

## Categories

| Slug | Name |
|------|------|
| health-wellness | Health & Wellness |
| digital-skills | Digital Skills |
| life-learning | Life & Learning |

## Video sources by course

### healthy-living-older-adults

| Topic | Video | Original article | License |
|-------|-------|------------------|---------|
| Exercise and Physical Activity | [NIA 15-min workout](https://www.youtube.com/watch?v=Ev6yE55kYGw) | MedlinePlus exercise page | NIA / NIH (U.S. Gov) |
| Nutrition for Older Adults | [ACL Senior Nutrition](https://www.youtube.com/watch?v=RERcdAGeTZ8) | MedlinePlus nutrition page | ACL (U.S. Gov) |
| Osteoporosis Overview | [Falls & bone health Q&A](https://www.youtube.com/watch?v=pRvYsHKzG2Q) | MedlinePlus osteoporosis | NIA, NIAMS, ACL |
| Diabetes in Older Adults | [NIDDK diabetes ABCs](https://www.youtube.com/watch?v=IYg25EzdCKQ) | MedlinePlus diabetes | NIDDK / NIH |
| Older Adult Mental Health | [Combat loneliness](https://www.youtube.com/watch?v=-hKUHiIwbrM) | MedlinePlus mental health | NIA / NIH |

### nutrition-healthy-aging

| Topic | Video | Notes |
|-------|-------|-------|
| Nutrition intro | ACL Senior Nutrition (same as above) | Replaces OER Commons lesson (no embeddable video) |
| Wellness for the Ages | [NIA flexibility & cool-down](https://www.youtube.com/watch?v=kCQ6irSQwYA) | CC BY OER lesson → NIA video |
| Physiology of Aging | [NIA overview](https://www.youtube.com/watch?v=qMm5renQibo) | |
| Nutrition in Older Adults | [NIA upper-body strength](https://www.youtube.com/watch?v=pUYxcRvdal8) | |

Original OER: [Portland CC lesson 119812](https://oercommons.org/courseware/lesson/119812) (CC BY).

### discover-digital-health

| Topic | Video | License |
|-------|-------|---------|
| Course overview | [NLM MedlinePlus outreach](https://www.youtube.com/watch?v=mq-zPCQR2qY) | NLM-funded |
| Staying safe online | [CISA Secure Our World](https://www.youtube.com/watch?v=fgd-osFId00) | CISA (U.S. Gov) |

OpenLearn Create course (CC BY-NC-SA): [Discover Digital](https://www.open.edu/openlearncreate/course/view.php?id=8125).

### finding-reliable-health-info

| Topic | Video | License |
|-------|-------|---------|
| Evaluating health websites | [UNCG / MedlinePlus tips](https://www.youtube.com/watch?v=LlkR_1ib19o) | Educational (NLM resource) |
| Understanding medical research | [HHS OHRP](https://www.youtube.com/watch?v=_L5Tg7ciNNU) | HHS (U.S. Gov) |
| Health literacy | [HHS 5 things](https://www.youtube.com/watch?v=BG-iY-em7mk) | HHS |

### introducing-ageing

| Topic | Video | License |
|-------|-------|---------|
| Introduction to Ageing | [OpenLearn MP4 — Monty Meth](https://www.open.edu/openlearn/health-sports-psychology/introducing-ageing/content-section-2) | CC BY-NC-SA (Open University) |
| Ageing in Society | [OpenLearn MP4 — statistics](https://www.open.edu/openlearn/health-sports-psychology/introducing-ageing/content-section-4) | CC BY-NC-SA |

### age-friendly-care-basics (draft)

| Topic | Video |
|-------|-------|
| What Matters / Medication | [4Ms framework talk](https://www.youtube.com/watch?v=fTcXVigjsN8) |
| Mentation | [NIA music & aging](https://www.youtube.com/watch?v=g4rziPQ08rw) |
| Mobility | [NIA lower-body strength](https://www.youtube.com/watch?v=TOKxtgKrGCQ) |

Original OER: [4Ms lesson 124438](https://oercommons.org/courseware/lesson/124438) (CC BY).

### premium-wellness-workshop (paid placeholder)

| Topic | Video |
|-------|-------|
| Gentle exercise | [NIA balance walk](https://www.youtube.com/watch?v=z_GKdFf3qv4) |
| Healthy habits | [NIA flexibility](https://www.youtube.com/watch?v=kCQ6irSQwYA) |

## Production note

Replace CC BY-NC-SA (OpenLearn) courses with Tier-1 public domain sources before commercial launch.
