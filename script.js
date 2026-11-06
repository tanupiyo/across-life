
// あくろすLIFE：画面表示と試作用データ管理

const STORAGE_KEYS = {
  visits: "visits",
  points: "points",
  lastCheckin: "lastCheckin"
};

const GROWTH = {
  baby: 2,
  adult: 10,
  senior: 20,
  familyInterval: 30
};

function readNumber(key) {
  const value = Number(localStorage.getItem(key));
  return Number.isFinite(value) && value >= 0 ? value : 0;
}

let visits = Math.floor(readNumber(STORAGE_KEYS.visits));
let points = Math.floor(readNumber(STORAGE_KEYS.points));
let lastCheckin = localStorage.getItem(STORAGE_KEYS.lastCheckin) || "";
let careMessageTimer = null;

function getFamilyMembers(totalVisits) {
  const memberCount = Math.floor(totalVisits / GROWTH.familyInterval) + 1;

  return Array.from({ length: memberCount }, (_, index) => {
    const memberVisits = totalVisits - index * GROWTH.familyInterval;

    let stage = "egg";

    if (memberVisits >= GROWTH.senior) {
      stage = "senior";
    } else if (memberVisits >= GROWTH.adult) {
      stage = "adult";
    } else if (memberVisits >= GROWTH.baby) {
      stage = "baby";
    }

    return {
      number: index + 1,
      stage,
      stageLabel: {
        egg: "たまご",
        baby: "BABYめじろう",
        adult: "めじろう",
        senior: "シニアめじろう"
      }[stage],
      emoji: {
        egg: "🥚",
        baby: "🐣",
        adult: "🐦",
        senior: "🐦"
      }[stage]
    };
  });
}

function getGrowthProgress(totalVisits, member) {
  const memberVisits =
    totalVisits - (member.number - 1) * GROWTH.familyInterval;

  let currentThreshold;
  let nextThreshold;
  let nextLabel;

  if (memberVisits < GROWTH.baby) {
    currentThreshold = 0;
    nextThreshold = GROWTH.baby;
    nextLabel = "BABYめじろう誕生";
  } else if (memberVisits < GROWTH.adult) {
    currentThreshold = GROWTH.baby;
    nextThreshold = GROWTH.adult;
    nextLabel = "めじろうに成長";
  } else if (memberVisits < GROWTH.senior) {
    currentThreshold = GROWTH.adult;
    nextThreshold = GROWTH.senior;
    nextLabel = "シニアめじろうに成長";
  } else {
    const nextEggVisit =
      (Math.floor(totalVisits / GROWTH.familyInterval) + 1) *
      GROWTH.familyInterval;

    return {
      progress: 0,
      message: `次のたまごまであと${nextEggVisit - totalVisits}回来館！`
    };
  }

  const progress =
    ((memberVisits - currentThreshold) /
      (nextThreshold - currentThreshold)) * 100;

  return {
    progress: Math.max(0, Math.min(100, progress)),
    message: `あと${nextThreshold - memberVisits}回来館すると${nextLabel}！`
  };
}

function updateFamilySummary(members) {
  const summary = document.getElementById("familySummary");
  if (!summary) return;

  summary.replaceChildren();

  if (members.length === 1) return;

  const heading = document.createElement("strong");
  heading.textContent = `めじろうファミリー ${members.length}匹`;
  summary.appendChild(heading);

  const list = document.createElement("div");
  list.className = "family-list";

  members.forEach((member) => {
    const item = document.createElement("span");
    item.className = "family-member";
    item.textContent = `${member.emoji} ${member.number}匹目：${member.stageLabel}`;
    list.appendChild(item);
  });

  summary.appendChild(list);
}

function updateScreen() {
  const members = getFamilyMembers(visits);
  const mainMember = members[0];
  const growth = getGrowthProgress(visits, mainMember);

  document.getElementById("pointCount").textContent = points;
  document.getElementById("visitCount").textContent = `来館回数：${visits}回`;
  document.getElementById("level").textContent = mainMember.stageLabel;
  document.getElementById("growthProgress").style.width =
    `${growth.progress}%`;
  document.getElementById("growthMessage").textContent = growth.message;
  document.getElementById("characterName").textContent = mainMember.stageLabel;

  const characterMessage = document.getElementById("characterMessage");
  const pet = document.getElementById("pet");
  const pet3d = document.getElementById("pet3d");

  const isBaby = mainMember.stage === "baby";
  const isAdult = mainMember.stage === "adult";
  const isSenior = mainMember.stage === "senior";

  // 画像表示エリアを使用する
  pet.style.display = "flex";

  // 以前の3Dモデルは表示しない
  if (pet3d) {
    pet3d.style.display = "none";
  }

  // 成長段階に応じて画像を切り替える
  if (isBaby || isAdult || isSenior) {
    const image = document.createElement("img");

    if (isBaby) {
      image.src = "baby_mejiro.png";
      image.alt = "BABYめじろう";
    } else if (isAdult) {
      image.src = "mejiro.png";
      image.alt = "めじろう";
    } else {
      image.src = "senior_mejiro.png";
      image.alt = "シニアめじろう";
    }

    pet.replaceChildren(image);
  } else {
    pet.textContent = mainMember.emoji;
  }

// 成長段階ごとのCSSクラスを設定
pet.classList.toggle("baby-character", isBaby);
pet.classList.toggle("adult-character", isAdult);
pet.classList.toggle("senior-character", isSenior);

// 100回来館ごとに、新しいたまごを隣に表示する
const newestMember = members[members.length - 1];

if (members.length > 1 && newestMember.stage === "egg") {
  const egg = document.createElement("span");
  egg.className = "new-egg";
  egg.textContent = "🥚";
  egg.setAttribute("aria-label", "新しいたまご");
  pet.appendChild(egg);
}

  const messages = {
    egg: visits === 0
      ? "あくろすに来て、たまごを育てよう！"
      : "もうすぐ生まれるよ！",
    baby: "BABYめじろうが元気に育っているよ！",
    adult: "今日もお部屋でのんびりしているよ。",
    senior: "あくろすの思い出がいっぱい！"
  };

  characterMessage.textContent = messages[mainMember.stage];

  updateFamilySummary(members);

  const today = new Date().toLocaleDateString("ja-JP");
  const checkinButton = document.getElementById("checkinBtn");
  const alreadyCheckedIn = lastCheckin === today;

  checkinButton.disabled = alreadyCheckedIn;
  checkinButton.textContent = alreadyCheckedIn
    ? "今日は来館チェックイン済み"
    : "あくろすに来館した！";
}

function care(action) {
  const reactions = {
    feed: { message: "ごはんをもらってうれしそう！" },
    pet: { message: "なでてもらってごきげん！" },
    play: { message: "一緒に遊んで楽しかったみたい！" }
  };

  const reaction = reactions[action];
  if (!reaction) return;

  const pet = document.getElementById("pet");

  if (pet) {
    pet.classList.remove(
      "action-feed",
      "action-pet",
      "action-play"
    );

    void pet.offsetWidth;
    pet.classList.add(`action-${action}`);

    window.setTimeout(() => {
      pet.classList.remove(`action-${action}`);
    }, 1400);
  }

  if (action === "pet") {
    window.dispatchEvent(new Event("mejiroPet"));
  }

  window.dispatchEvent(
    new CustomEvent("mejiroAction", { detail: action })
  );

  const message = document.getElementById("careMessage");
  message.textContent = reaction.message;

  if (careMessageTimer) {
    window.clearTimeout(careMessageTimer);
  }

  careMessageTimer = window.setTimeout(() => {
    message.textContent = "また遊んでね！";
    careMessageTimer = null;
  }, 1800);
}

document.getElementById("feedBtn").addEventListener("click", () => care("feed"));
document.getElementById("petBtn").addEventListener("click", () => care("pet"));
document.getElementById("playBtn").addEventListener("click", () => care("play"));

document.getElementById("checkinBtn").addEventListener("click", () => {
  const today = new Date().toLocaleDateString("ja-JP");
  if (lastCheckin === today) return;

  visits += 1;
  points += 1;
  lastCheckin = today;

  localStorage.setItem(STORAGE_KEYS.visits, String(visits));
  localStorage.setItem(STORAGE_KEYS.points, String(points));
  localStorage.setItem(STORAGE_KEYS.lastCheckin, lastCheckin);

  document.getElementById("checkinMessage").textContent =
    "来館ありがとう！めじろうの成長が楽しみだね！";

  window.dispatchEvent(new Event("mejiroCheckin"));
  updateScreen();
});

updateScreen();
