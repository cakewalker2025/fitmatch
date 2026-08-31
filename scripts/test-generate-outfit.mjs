const ENDPOINT = "http://localhost:3000/api/generate-outfit";

const wardrobe = [
  {
    id: "top-1",
    category: "top",
    primaryColor: "#f5f5f0",
    secondaryColors: [],
    pattern: "solid",
    fabricWeight: "light",
    formality: "smart-casual",
  },
  {
    id: "bottom-1",
    category: "bottom",
    primaryColor: "#1f2a44",
    secondaryColors: [],
    pattern: "solid",
    fabricWeight: "medium",
    formality: "smart-casual",
  },
  {
    id: "footwear-1",
    category: "footwear",
    primaryColor: "#5b3a29",
    secondaryColors: [],
    pattern: "solid",
    fabricWeight: "heavy",
    formality: "smart-casual",
  },
  {
    id: "outerwear-1",
    category: "outerwear",
    primaryColor: "#c19a6b",
    secondaryColors: [],
    pattern: "solid",
    fabricWeight: "heavy",
    formality: "business",
  },
];

const profile = {
  skinUndertone: "warm",
  skinDepth: "medium",
  hairColor: "dark brown",
  eyeColor: "brown",
  bodyShape: "rectangle",
  height: "5'10\"",
  occasion: "business casual office day",
};

let response;
try {
  response = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ wardrobe, profile }),
  });
} catch (error) {
  console.error(
    `Failed to reach ${ENDPOINT}. Is the dev server running (npm run dev)?\n${error.message}`
  );
  process.exit(1);
}

const body = await response.json();

if (!response.ok) {
  console.error(`Request failed (${response.status}):`);
  console.error(JSON.stringify(body, null, 2));
  process.exit(1);
}

console.log(JSON.stringify(body, null, 2));
