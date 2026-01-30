

// are.na 채널 (각각 매핑)
const ARENA_CHANNELS = [
  {
    url: "https://www.are.na/heekyung-kim/collection-channel1-l6vz7rdynea",
    typeClass: "type_1",
  },
  {
    url: "https://www.are.na/heekyung-kim/collection-channel2-_6udjhcefiu",
    typeClass: "type_2",
  },
  {
    url: "https://www.are.na/heekyung-kim/collection-channel3-yw8b-mozvgm",
    typeClass: "type_3",
  },
  {
    url: "https://www.are.na/heekyung-kim/collection-channel4-pryilyvzkq0",
    typeClass: "type_4",
  },
  {
    url: "https://www.are.na/heekyung-kim/collection-channel5",
    typeClass: "type_5",
  },
  {
    url: "https://www.are.na/heekyung-kim/collection-channel6",
    typeClass: "type_6",
  },
  {
    url: "https://www.are.na/heekyung-kim/collection-channel7",
    typeClass: "type_7",
  },
];


// 공개 채널이면 빈 값으로 OK. 비공개면 Personal Access Token 필요.
const ARENA_TOKEN = "";
const IMAGES_PER_PAGE = 50;

function slugFromUrl(url) {
  try {
    const u = new URL(url);
    const parts = u.pathname.split("/").filter(Boolean);
    return parts[parts.length - 1];
  } catch {
    return String(url).trim();
  }
}

async function arenaFetch(path, params = {}) {
  const base = "https://api.are.na/v2";
  const sp = new URLSearchParams(params);
  const url = `${base}${path}?${sp.toString()}`;

  const headers = {};
  if (ARENA_TOKEN) headers["Authorization"] = `Bearer ${ARENA_TOKEN}`;

  const res = await fetch(url, { headers });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Are.na ${res.status}: ${text || res.statusText}`);
  }
  return res.json();
}


function pickImageUrl(img) {
  if (!img) return "";
  return (
    (img.display && img.display.url) ||
    (img.large && img.large.url) ||
    (img.original && img.original.url) ||
    ""
  );
}



function $(sel) {
  return document.querySelector(sel);
}

function setLoading(msg) {
  const el = $("#loading");
  if (!el) return;
  el.textContent = msg;
}

function removeLoading() {
  const el = $("#loading");
  if (el) el.remove();
}


function renderImages(galleryEl, items, typeClass) {
  const frag = document.createDocumentFragment();

  for (const b of items) {
    const src = pickImageUrl(b.image);
    if (!src) continue;

    const img = document.createElement("img");
    img.loading = "lazy";
    img.src = src;
    img.alt = b.title || "";
    img.classList.add(typeClass);
    img.dataset.type = typeClass;

    frag.appendChild(img);
  }

  galleryEl.appendChild(frag);
}


// 채널 하나에서 모든 이미지(페이지네이션 끝까지) 가져오기
async function fetchAllImagesFromChannel(channelSlug) {
  const all = [];
  let page = 1;

  while (true) {
    const data = await arenaFetch(`/channels/${channelSlug}/contents`, {
      per: IMAGES_PER_PAGE,
      page,
    });

    const imgs = (data.contents || []).filter((b) => b.class === "Image" && b.image);
    all.push(...imgs);

    if (!data.contents || data.contents.length < IMAGES_PER_PAGE) break;
    page += 1;
  }

  return all;
}



// 메뉴 필터(전체/타입별)
function bindFilters() {
  const links = document.querySelectorAll(".menu a[data-filter]");
  links.forEach((a) => {
    a.addEventListener("click", (e) => {
      e.preventDefault();
      const f = a.dataset.filter;

      const imgs = document.querySelectorAll(".gallery img");
      imgs.forEach((img) => {
        if (f === "all") {
          img.classList.remove("is-hidden");
        } else {
          img.classList.toggle("is-hidden", img.dataset.type !== f);
        }
      });
    });
  });
}

function shuffleInPlace(arr) {
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}


async function bootstrap() {
  const gallery = $("#gallery");
  if (!gallery) return;

  bindFilters();

  try {
    setLoading("Loading images from are.na…");

    // 3개 채널을 병렬로 가져오기

    const results = await Promise.all(
      ARENA_CHANNELS.map(async (ch) => {
        const slug = slugFromUrl(ch.url);
        const items = await fetchAllImagesFromChannel(slug);
        return { ...ch, slug, items };
      })
    );

    // 기존 로딩 문구 제거
    removeLoading();

    // 전체를 섞어서 렌더링

    const merged = [];
    results.forEach((r) => {
      r.items.forEach((item) => {
        merged.push({ item, typeClass: r.typeClass });
      });
    });

    shuffleInPlace(merged);

    const frag = document.createDocumentFragment();
    merged.forEach(({ item, typeClass }) => {
      const src = pickImageUrl(item.image);
      if (!src) return;

      const img = document.createElement("img");
      img.loading = "lazy";
      img.src = src;
      img.alt = item.title || "";
      img.classList.add(typeClass);
      img.dataset.type = typeClass;

      frag.appendChild(img);
    });
    gallery.appendChild(frag);


    // 아무 이미지도 없으면 안내
    const count = gallery.querySelectorAll("img").length;
    if (count === 0) {
      const p = document.createElement("p");
      p.className = "loading";
      p.textContent = "No images found in the are.na channels.";
      gallery.appendChild(p);
    }
  } catch (err) {
    console.error(err);
    setLoading("Failed to load images. Check console for details.");
  }
}

document.addEventListener("DOMContentLoaded", bootstrap);








