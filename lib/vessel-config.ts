export interface VesselConfig {
  id: string
  name: string
  description: string
  filename: string | null
  promptSpec: string
}

export const VESSEL_CONFIGS: VesselConfig[] = [
  {
    id: 'original',
    name: '원본 그릇 그대로',
    description: '업로드한 사진의 그릇을 그대로 유지합니다',
    filename: null,
    promptSpec: '',
  },
  {
    id: 'white-plate',
    name: '흰색 접시',
    description: '단품·덮밥·반찬류에 잘 어울려요',
    filename: 'plate-white.png',
    promptSpec: 'White ceramic dinner plate — round, shallow, clean white porcelain. CRITICAL SIZING RULE: The plate must be only slightly larger than the food portion itself. The food should cover 90–95% of the plate inner surface. The white rim visible around the food must be razor-thin — no wider than a finger\'s width. Think of the plate as a barely-visible base under the food, not a large empty canvas with food placed in the center. If you can see large areas of white plate around the food → the plate is too big → WRONG.',
  },
  {
    id: 'black-plate',
    name: '검정 접시',
    description: '스테이크·고급 플레이팅에 잘 어울려요',
    filename: 'plate-black.png',
    promptSpec: 'Matte black ceramic dinner plate — round, shallow, matte black finish, no gloss. CRITICAL SIZING RULE: The plate must be only slightly larger than the food portion itself. The food should cover 90–95% of the plate inner surface. The black rim visible around the food must be razor-thin — no wider than a finger\'s width. Think of the plate as a barely-visible base under the food, not a large empty canvas with food placed in the center. If you can see large areas of black plate around the food → the plate is too big → WRONG.',
  },
  {
    id: 'ttukbaegi',
    name: '뚝배기',
    description: '찌개·국밥류에 잘 어울려요',
    filename: 'ttukbaegi.jpg',
    promptSpec: 'Traditional Korean earthenware ttukbaegi — dark reddish-brown unglazed clay pot, rough porous exterior surface, slightly tapered cylindrical sides, thick walls, no lid. Bowl diameter ~14cm, depth ~8cm.',
  },
  {
    id: 'noodle-bowl',
    name: '면기',
    description: '국수·우동·짜장면류에 잘 어울려요',
    filename: 'noodle-bowl-white.jpg',
    promptSpec: 'White ceramic Korean noodle bowl — wide deep bowl with gently flared rim, smooth glossy white porcelain interior and exterior, traditional Korean style. Wide mouth diameter ~22cm, depth ~9cm.',
  },
  {
    id: 'naengmyeon-bowl',
    name: '냉면기',
    description: '냉면·비빔면에 잘 어울려요',
    filename: 'naengmyeon-silver.jpg',
    promptSpec: 'Silver polished stainless steel Korean naengmyeon bowl — wide shallow bowl with prominently flared outward rim, mirror-polished silver stainless steel finish. Diameter ~24cm, low depth.',
  },
  {
    id: 'hotpot',
    name: '전골냄비',
    description: '전골·찜·볶음탕에 잘 어울려요',
    filename: 'jeongol-pot.jpg',
    promptSpec: 'Korean jeongol hot pot — EXACT FIXED DESIGN (do not deviate): perfectly round wide shallow pan, matte black anodized aluminum. Body shape: gently curved bottom that widens toward the top (paella-pan silhouette), sides slope slightly outward, topped with a subtly outward-rolled rounded rim. Two identical arched loop handles — one on the left (9 o\'clock) and one on the right (3 o\'clock) — attached low on the outer side wall, curving upward in a smooth arch, same matte black metal as the body. No lid, no long handle, no spout. FOOD FILL RULE (mandatory): food and broth must fill the pot to at least 90% of its inner depth — virtually no empty space visible inside the pot.',
  },
  {
    id: 'pasta-bowl',
    name: '파스타 볼',
    description: '파스타·리조또·샐러드에 잘 어울려요',
    filename: 'pasta-bowl.jpg',
    promptSpec: 'White ceramic pasta rim bowl — shallow concave center with a wide flat elevated rim, clean white porcelain, Italian fine dining style. Overall diameter ~28cm, center bowl ~18cm.',
  },
  {
    id: 'wood-board',
    name: '우드 도마',
    description: '피자·빵·샌드위치류에 잘 어울려요',
    filename: 'wood-board.jpg',
    promptSpec: 'Natural wood serving board — rectangular flat wooden platter, warm oak or walnut grain texture, smooth flat surface used as a food serving board placed directly on the table. Approximately 35cm × 22cm.',
  },
]

export function getVesselConfig(id: string): VesselConfig | undefined {
  return VESSEL_CONFIGS.find(v => v.id === id)
}
