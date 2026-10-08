<script setup>
import { emotionExamples } from './data/emotionExamples.js';
import { ref, reactive, computed, watch, onMounted, onUnmounted, nextTick } from 'vue';

import heroImage from './assets/hero.webp';
import arrowImage from './assets/screens/arrow-guide.webp';
import helpIcon from './assets/screens/help.webp';
import { createImagePreloader } from './lib/imagePreloader.js';
import { fruitSlotStyle } from './lib/fruitLayout.js';
import backgroundImage from './assets/background.webp';
import challengeSpeechBubble from './assets/challenge-speech-bubble.webp';
import helpCloseButton from './assets/help-close-button.webp';
import helpCompleteButton from './assets/help-complete-button.webp';
import startButton from './assets/start-button.webp';
import how1 from './assets/screens/how1.webp';
import how2 from './assets/screens/how2.webp';
import how3 from './assets/screens/how3.webp';
import how4 from './assets/screens/how4.webp';
import rolesBg from './assets/screens/roles.webp';
import courseBg from './assets/screens/course-bg.webp';
import courseEasy from './assets/screens/course-easy.webp';
import courseHard from './assets/screens/course-hard.webp';
import courseMix from './assets/screens/course-mix.webp';
import confirmBg from './assets/screens/confirm-bg.webp';
import yesImage from './assets/screens/yes.webp';
import noImage from './assets/screens/no.webp';
import customerHandoff from './assets/screens/customer-handoff.webp';
import shopBg from './assets/screens/shop.webp';
import shopping from './assets/screens/froutback.webp';
import FruitHero from './components/FruitHero.vue';
import ImageButton from './components/ImageButton.vue';
import ScreenFrame from './components/ScreenFrame.vue';
import NavArrow from './components/NavArrow.vue';
import HelpMenu from './components/HelpMenu.vue';
import FruitCard from './components/FruitCard.vue';
import SoundIcon from './components/SoundIcon.vue';
import QuestionText from './components/QuestionText.vue';
import { gestureQuestions, associationQuestions, finalQuestion, pickRandomQuestion } from './lib/questions.js';
import { createCountdown } from './lib/countdown.js';
import { useSfx } from './composables/useSfx.js';
import { useModalFocus } from './composables/useModalFocus.js';

const imagePreloader = createImagePreloader();
const clerkFruit = ref(null);
const screen = ref('home');
const history = ref([]);
const helpOpen = ref(false);
const helpReturnScreen = ref('home');
const homeConfirm = ref(false);
const homeDialog = ref(null);
const gameSurface = ref(null);
const { open: openHomeConfirm, cancel: cancelHomeConfirm } = useModalFocus(homeConfirm, homeDialog, gameSurface);
const selectedCourse = ref('easy');
const selectedFruit = ref(null);
const selectedEmotion = ref(null);
const attempts = ref(3);
const correctFruit = ref(null);
const remainingSeconds = ref(180);
const oneMinuteAcknowledged = ref(false);
const timeUpAcknowledged = ref(false);
const timerStarted = ref(false);
const questionPreviewOpen = ref(false);
let timerInterval;
const countdown = createCountdown(180);
let webMcpLifecycle;
const dropZone = ref(null);
const dragging = ref(false);
const overBasket = ref(false);
const keyboardFruit = ref(null);
const sfx = useSfx();
const muted = sfx.muted;
const fullscreenAvailable = ref(false);
const fullscreenActive = ref(false);
const fullscreenNotice = ref('');
function syncFullscreen() {
  fullscreenActive.value = Boolean(document.fullscreenElement);
}
async function toggleFullscreen() {
  fullscreenNotice.value = '';
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
  } catch {
    fullscreenNotice.value = 'このブラウザでは全画面表示に切り替えられませんでした。';
  }
  syncFullscreen();
}
const dragDisabled = computed(
  () =>
    helpOpen.value ||
    homeConfirm.value ||
    questionPreviewOpen.value ||
    (screen.value === 'clerkShop' &&
      ((remainingSeconds.value <= 60 && remainingSeconds.value > 0 && !oneMinuteAcknowledged.value) ||
        (remainingSeconds.value === 0 && !timeUpAcknowledged.value)))
);

function guardHelpMenuBackground(event) {
  if (!helpOpen.value || homeConfirm.value || event.target.closest?.('.help-wrap')) return false;
  // Keep the menu open until click so pointerup cannot reach the game beneath it.
  event.preventDefault();
  event.stopImmediatePropagation();
  return true;
}
function onButtonClick(event) {
  if (guardHelpMenuBackground(event)) {
    const trigger = event.currentTarget.querySelector('.help-button');
    const previousScreen = screen.value;
    helpOpen.value = false;
    nextTick(() => {
      if (!helpOpen.value && !homeConfirm.value && screen.value === previousScreen && trigger?.isConnected) {
        trigger.focus({ preventScroll: true });
      }
    });
    return;
  }
  const button = event.target.closest('button');
  if (!button) {
    void sfx.unlock();
    void sfx.preload();
    return;
  }
  if (
    button &&
    !button.disabled &&
    button.getAttribute('aria-disabled') !== 'true' &&
    !button.closest('[data-sfx-skip]')
  )
    void sfx.play(button.dataset.sfxKind || 'button');
}
function onDragChange(state) {
  dragging.value = state.active;
  overBasket.value = state.over;
}
function onFruitDrop(fruit) {
  void sfx.play('drop');
  selectFruit(fruit);
}
const fruits = [
  { id: 'anger-apple', emoji: '🍎', fruitName: 'りんご', feeling: 'おこる' },
  { id: 'fear-chestnut', emoji: '🌰', fruitName: '栗', feeling: 'こわい' },
  {
    id: 'startled-blueberry',
    emoji: '🫐',
    fruitName: 'ブルーベリー',
    feeling: '（びびり）\nびっくり'
  },
  {
    id: 'happy-surprise-banana',
    emoji: '🍌',
    fruitName: 'バナナ',
    feeling: '（うれしくて）\nびっくり'
  },
  {
    id: 'funny-orange',
    emoji: '🍊',
    fruitName: 'みかん',
    feeling: 'おもしろい'
  },
  {
    id: 'motivated-strawberry',
    emoji: '🍓',
    fruitName: 'いちご',
    feeling: 'やるきがある'
  },
  { id: 'noisy-persimmon', emoji: '🟠', fruitName: '柿', feeling: 'うるさい' },
  { id: 'danger-apple', emoji: '🍎', fruitName: 'りんご', feeling: 'あぶない' },
  {
    id: 'anxious-pear',
    emoji: '🍐',
    fruitName: '梨',
    feeling: 'ふあん・\nしんぱい'
  },
  { id: 'happy-banana', emoji: '🍌', fruitName: 'バナナ', feeling: 'うれしい' },
  {
    id: 'excited-orange',
    emoji: '🍊',
    fruitName: 'みかん',
    feeling: 'こうふんした'
  },
  { id: 'joy-banana', emoji: '🍌', fruitName: 'バナナ', feeling: 'よろこぶ' },
  { id: 'dislike-grape', emoji: '🍇', fruitName: 'ぶどう', feeling: 'いや' },
  { id: 'troubled-grape', emoji: '🍇', fruitName: 'ぶどう', feeling: 'こまる' },
  {
    id: 'embarrassed-peach',
    emoji: '🍑',
    fruitName: '桃',
    feeling: 'はずかしい'
  },
  {
    id: 'irritated-persimmon',
    emoji: '🟠',
    fruitName: '柿',
    feeling: 'いらいら'
  },
  {
    id: 'enjoyable-orange',
    emoji: '🍊',
    fruitName: 'みかん',
    feeling: 'たのしい'
  },
  { id: 'happiness-peach', emoji: '🍑', fruitName: '桃', feeling: 'しあわせ' },
  { id: 'love-strawberry', emoji: '🍓', fruitName: 'いちご', feeling: 'あい' },
  { id: 'like-peach', emoji: '🍑', fruitName: '桃', feeling: 'すき' },
  {
    id: 'persistent-grape',
    emoji: '🍇',
    fruitName: 'ぶどう',
    feeling: 'しつこい'
  },
  { id: 'shock-chestnut', emoji: '🌰', fruitName: '栗', feeling: 'しょっく' },
  {
    id: 'boring-chestnut',
    emoji: '🌰',
    fruitName: '栗',
    feeling: 'おもしろくない'
  },
  {
    id: 'relaxed-kiwi',
    emoji: '🥝',
    fruitName: 'キウイ',
    feeling: 'きらく・\nのんびり'
  },
  {
    id: 'wonderful-banana',
    emoji: '🍌',
    fruitName: 'バナナ',
    feeling: 'すてき'
  },
  { id: 'moved-orange', emoji: '🍊', fruitName: 'みかん', feeling: 'かんどう' },
  {
    id: 'tearful-blueberry',
    emoji: '🫐',
    fruitName: 'ブルーベリー',
    feeling: 'なきたい'
  },
  {
    id: 'sympathy-blueberry',
    emoji: '🫐',
    fruitName: 'ブルーベリー',
    feeling: 'かわいそう'
  },
  {
    id: 'lonely-blueberry',
    emoji: '🫐',
    fruitName: 'ブルーベリー',
    feeling: 'さびしい'
  },
  {
    id: 'disappointed-blueberry',
    emoji: '🫐',
    fruitName: 'ブルーベリー',
    feeling: 'がっかりする'
  },
  {
    id: 'relax-watermelon',
    emoji: '🍉',
    fruitName: 'スイカ',
    feeling: 'りらっくす'
  },
  {
    id: 'relief-watermelon',
    emoji: '🍉',
    fruitName: 'スイカ',
    feeling: 'あんしんする・\nほっとする'
  },
  {
    id: 'gratitude-orange',
    emoji: '🍊',
    fruitName: 'みかん',
    feeling: 'かんしゃ'
  },
  {
    id: 'kind-kiwi',
    emoji: '🥝',
    fruitName: 'キウイ',
    feeling: 'やさしい・\nしんせつ'
  },
  {
    id: 'sad-blueberry',
    emoji: '🫐',
    fruitName: 'ブルーベリー',
    feeling: 'かなしい'
  },
  {
    id: 'frustrated-grape',
    emoji: '🍇',
    fruitName: 'ぶどう',
    feeling: 'くやしい'
  },
  { id: 'tired-pear', emoji: '🍐', fruitName: '梨', feeling: 'つかれた' },
  { id: 'calm-kiwi', emoji: '🥝', fruitName: 'キウイ', feeling: 'おだやか' },
  {
    id: 'unconcerned-pear',
    emoji: '🍐',
    fruitName: '梨',
    feeling: 'きにしない'
  },
  {
    id: 'pleasant-watermelon',
    emoji: '🍉',
    fruitName: 'スイカ',
    feeling: 'きもちいい'
  }
];
// Course membership uses stable IDs; labels and artwork stay on the original fruits.
const easyFruitIds = new Set([
  "danger-apple",
  "anxious-pear",
  "dislike-grape",
  "embarrassed-peach",
  "anger-apple",
  "noisy-persimmon",
  "fear-chestnut",
  "shock-chestnut",
  "boring-chestnut",
  "tearful-blueberry",
  "sympathy-blueberry",
  "sad-blueberry",
  "lonely-blueberry",
  "joy-banana",
  "like-peach",
  "motivated-strawberry",
  "happy-banana",
  "funny-orange",
  "enjoyable-orange",
  "kind-kiwi",
]);
const displayedFruits = ref([]);

function pickRandomFruits() {
  const shuffled = fruits.filter((fruit) =>
    selectedCourse.value === "mix" ||
    (selectedCourse.value === "easy" ? easyFruitIds.has(fruit.id) : !easyFruitIds.has(fruit.id)),
  );
  for (let index = shuffled.length - 1; index > 0; index--) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
  }
  displayedFruits.value = shuffled.slice(0, 8);
}

pickRandomFruits();
const courseImages = { easy: courseEasy, hard: courseHard, mix: courseMix };
const courseLabels = {
  easy: 'かんたん',
  hard: 'むずかしい',
  mix: 'ごちゃまぜ'
};
const howThreeExampleQuestion = associationQuestions[0];
const howScreens = ['how1', 'how2', 'how3', 'how4'];
const howBackgrounds = { how1, how2, how3, how4 };
const helpScreens = ['help1', 'help2', 'help3', 'help4'];
const helpBackgrounds = {
  help1: rolesBg,
  help2: how2,
  help3: how3,
  help4: how4
};
function screenImages(name) {
  const images = {
    home: [backgroundImage, heroImage, startButton],
    terms: [backgroundImage],
    guide: [how1, arrowImage],
    how1: [how1, arrowImage],
    how2: [how2, arrowImage],
    how3: [how3, arrowImage],
    how4: [how4, arrowImage],
    help1: [rolesBg, helpCloseButton, arrowImage],
    help2: [how2, helpCloseButton, arrowImage],
    help3: [how3, challengeSpeechBubble, helpCloseButton, arrowImage],
    help4: [how4, helpCloseButton, helpCompleteButton, arrowImage],
    roles: [rolesBg, arrowImage],
    courses: [courseBg, courseEasy, courseHard, courseMix, arrowImage],
    courseConfirm: [confirmBg, courseImages[selectedCourse.value], yesImage, noImage],
    customerHandoff: [customerHandoff, arrowImage],
    customerShop: [shopBg],
    customerConfirm: [shopBg],
    clerkHandoff: [backgroundImage, arrowImage],
    clerkRules: [backgroundImage, arrowImage],
    question: [shopBg, arrowImage],
    questionConfirm: [shopBg],
    productIntro: [shopping],
    clerkShop: [shopping],
    productConfirm: [shopBg],
    success: [backgroundImage],
    failure: [backgroundImage],
    finalFailure: [backgroundImage]
  };
  const withMenu = [
    'roles',
    'courses',
    'courseConfirm',
    'customerHandoff',
    'customerShop',
    'customerConfirm',
    'clerkHandoff',
    'clerkRules',
    'question',
    'questionConfirm',
    'productIntro',
    'clerkShop',
    'productConfirm',
    'failure',
    'finalFailure'
  ];
  return withMenu.includes(name) ? [...(images[name] || []), helpIcon] : images[name] || [];
}
function likelyNextScreen(name) {
  return {
    home: 'terms',
    terms: 'guide',
    guide: 'how1',
    how1: 'how2',
    how2: 'how3',
    how3: 'how4',
    how4: 'roles',
    roles: 'courses',
    courses: 'courseConfirm',
    courseConfirm: 'customerHandoff',
    customerHandoff: 'customerShop',
    customerShop: 'customerConfirm',
    customerConfirm: 'clerkHandoff',
    clerkHandoff: 'clerkRules',
    clerkRules: 'question',
    question: 'productIntro',
    questionConfirm: 'productIntro',
    productIntro: 'clerkShop',
    clerkShop: 'productConfirm',
    productConfirm: 'success',
    success: 'home',
    failure: 'question',
    finalFailure: 'roles',
    help1: 'help2',
    help2: 'help3',
    help3: 'help4',
    help4: helpReturnScreen.value
  }[name];
}
function prepareScreenImages() {
  void imagePreloader.plan(screenImages(screen.value), screenImages(likelyNextScreen(screen.value)));
}
watch([screen, selectedCourse], prepareScreenImages, { flush: 'post' });
const gestureQuestion = ref(pickRandomQuestion(gestureQuestions));
const associationQuestion = ref(pickRandomQuestion(associationQuestions));
const questionNumber = computed(() => 4 - attempts.value);
const questionText = computed(() => {
  if (questionNumber.value === 1) return gestureQuestion.value;
  if (questionNumber.value === 2) return associationQuestion.value;
  return finalQuestion;
});
function resampleQuestions() {
  gestureQuestion.value = pickRandomQuestion(gestureQuestions);
  associationQuestion.value = pickRandomQuestion(associationQuestions);
}
function startGame() {
  resampleQuestions();
  attempts.value = 3;
  go('terms');
}
const formattedTime = computed(() => {
  const minutes = Math.floor(remainingSeconds.value / 60);
  const seconds = remainingSeconds.value % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
});

function katakanaToHiragana(text) {
  return [...text]
    .map((character) => {
      const code = character.charCodeAt(0);
      return code >= 0x30a1 && code <= 0x30f6 ? String.fromCharCode(code - 0x60) : character;
    })
    .join('');
}

function applyKatakanaReadings() {
  const root = document.querySelector('.viewport');
  if (!root) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!/[ァ-ヴー]/.test(node.nodeValue || '')) return NodeFilter.FILTER_REJECT;
      if (node.parentElement?.closest('ruby, rt, script, style, .terms-body')) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    }
  });
  const textNodes = [];
  while (walker.nextNode()) textNodes.push(walker.currentNode);
  textNodes.forEach((node) => {
    const fragment = document.createDocumentFragment();
    node.nodeValue.split(/([ァ-ヴー]+)/g).forEach((part) => {
      if (!part) return;
      if (/^[ァ-ヴー]+$/.test(part)) {
        const ruby = document.createElement('ruby');
        ruby.className = 'katakana-ruby';
        ruby.append(document.createTextNode(part));
        const reading = document.createElement('rt');
        reading.textContent = katakanaToHiragana(part);
        ruby.append(reading);
        fragment.append(ruby);
      } else fragment.append(document.createTextNode(part));
    });
    node.replaceWith(fragment);
  });
}

watch([screen, helpOpen, homeConfirm], () => nextTick(applyKatakanaReadings), {
  immediate: true
});
watch([screen, helpOpen, homeConfirm], ([nextScreen, menuOpen, homeDialogOpen]) => {
  countdown.pause();
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = undefined;
  remainingSeconds.value = countdown.seconds;
  const timedScreen = nextScreen === 'clerkShop' || nextScreen === 'productConfirm';
  const timedHelp =
    helpScreens.includes(nextScreen) &&
    (helpReturnScreen.value === 'clerkShop' || helpReturnScreen.value === 'productConfirm');
  if (!timedScreen && !timedHelp) {
    timerStarted.value = false;
    return;
  }
  if (timedHelp) return; // Keep remaining time and warning acknowledgements intact.
  if (!timerStarted.value) {
    if (nextScreen !== 'clerkShop') return;
    countdown.reset();
    remainingSeconds.value = countdown.seconds;
    oneMinuteAcknowledged.value = false;
    timeUpAcknowledged.value = false;
    timerStarted.value = true;
  }
  if (menuOpen || homeDialogOpen) return;
  countdown.resume();
  timerInterval = setInterval(() => {
    remainingSeconds.value = countdown.seconds;
  }, 250);
});
watch(screen, () => {
  dragging.value = false;
  overBasket.value = false;
  keyboardFruit.value = null;
  questionPreviewOpen.value = false;
});
function registerGameTools() {
  if (!document.modelContext?.registerTool) return;
  webMcpLifecycle = new AbortController();
  const visibleState = () => ({
    screen: screen.value,
    remainingSeconds: screen.value === 'clerkShop' ? remainingSeconds.value : null,
    fruits: ['customerShop', 'clerkShop'].includes(screen.value)
      ? displayedFruits.value.map(({ id, fruitName, feeling }) => ({
          id,
          fruitName,
          feeling
        }))
      : [],
    canPlaceFruit: ['customerShop', 'clerkShop'].includes(screen.value) && !dragDisabled.value
  });
  const tools = [
    {
      name: 'get_fruit_game_view',
      title: '果物ゲームの表示を確認',
      description: 'Read the current visible game screen and fruit choices. Does not reveal hidden answers.',
      inputSchema: {
        type: 'object',
        properties: {},
        additionalProperties: false
      },
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      execute: () => visibleState()
    },
    {
      name: 'place_fruit_in_basket',
      title: 'えらんだ果物をレジに置く',
      description:
        'Place a currently visible fruit in the basket and open its confirmation screen, like completing a drag onto the basket.',
      inputSchema: {
        type: 'object',
        properties: { fruit_id: { type: 'string' } },
        required: ['fruit_id'],
        additionalProperties: false
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      async execute(input) {
        if (!input || typeof input.fruit_id !== 'string' || Object.keys(input).some((key) => key !== 'fruit_id'))
          throw new Error('A fruit_id is required.');
        if (!visibleState().canPlaceFruit) throw new Error('Fruit selection is not available on this screen.');
        const fruit = displayedFruits.value.find((item) => item.id === input.fruit_id);
        if (!fruit) throw new Error('Choose a fruit from the visible list.');
        selectFruit(fruit);
        await nextTick();
        return {
          screen: screen.value,
          selectedFruit: { id: fruit.id, fruitName: fruit.fruitName }
        };
      }
    }
  ];
  for (const tool of tools) {
    try {
      void Promise.resolve(
        document.modelContext.registerTool(tool, {
          signal: webMcpLifecycle.signal
        })
      ).catch(() => {});
    } catch {
      /* This optional browser interface must never affect play. */
    }
  }
}
onMounted(() => {
  nextTick(applyKatakanaReadings);
  void sfx.preload();
  registerGameTools();
  prepareScreenImages();
  fullscreenAvailable.value = Boolean(document.fullscreenEnabled && document.documentElement.requestFullscreen);
  syncFullscreen();
  document.addEventListener('fullscreenchange', syncFullscreen);
});
onUnmounted(() => {
  if (timerInterval) clearInterval(timerInterval);
  sfx.dispose();
  imagePreloader.dispose();
  document.removeEventListener('fullscreenchange', syncFullscreen);
  webMcpLifecycle?.abort();
});

function go(next) {
  if (next === 'how1' && helpOpen.value) {
    helpReturnScreen.value = screen.value;
    screen.value = 'help1';
    helpOpen.value = false;
    return;
  }
  if (next === 'customerShop' && screen.value === 'customerHandoff') pickRandomFruits();
  history.value.push(screen.value);
  screen.value = next;
  helpOpen.value = false;
}
function back() {
  screen.value = history.value.pop() || 'home';
  helpOpen.value = false;
}
function closeHelp() {
  screen.value = helpReturnScreen.value;
  helpOpen.value = false;
}
function selectCourse(id) {
  selectedCourse.value = id;
  pickRandomFruits();
  go("courseConfirm");
}
function selectFruit(fruit) {
  if (!fruit || !displayedFruits.value.some((item) => item.id === fruit.id)) return;
  if (screen.value !== 'customerShop' && screen.value !== 'clerkShop') return;
  selectedFruit.value = fruit;
  selectedEmotion.value = fruit.feeling.replace(/\n/g, '').trim().normalize();
  if (screen.value === 'customerShop') {
    correctFruit.value = fruit;
  } else {
    clerkFruit.value = fruit;
  }
  go(screen.value === 'customerShop' ? 'customerConfirm' : 'productConfirm');
}

function judge() {
  // どちらかが未選択なら判定しない
  if (!correctFruit.value || !clerkFruit.value) return;

  // フルーツの id が同じなら正解
  if (clerkFruit.value.id === correctFruit.value.id) {
    void sfx.play('success');
    go('success');
  } else if (attempts.value > 1) {
    void sfx.play('retry');
    attempts.value--;
    go('failure');
  } else {
    void sfx.play('retry');
    go('finalFailure');
  }
}

function resetHome() {
  screen.value = 'home';
  history.value = [];
  helpOpen.value = false;
  homeConfirm.value = false;
  selectedFruit.value = null;
  correctFruit.value = null;
  attempts.value = 3;
}

function retryGame() {
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = undefined;
  countdown.reset();
  remainingSeconds.value = 180;
  timerStarted.value = false;
  oneMinuteAcknowledged.value = false;
  timeUpAcknowledged.value = false;
  selectedFruit.value = null;
  correctFruit.value = null;
  clerkFruit.value = null;
  attempts.value = 3;
  helpOpen.value = false;
  homeConfirm.value = false;
  helpReturnScreen.value = 'roles';
  questionPreviewOpen.value = false;
  keyboardFruit.value = null;
  dragging.value = false;
  overBasket.value = false;
  selectedCourse.value = 'easy';
  resampleQuestions();
  pickRandomFruits();
  // A new game has no route back into the previous answer or failure screens.
  history.value = ['home'];
  screen.value = 'roles';
}
</script>

<template>
  <main
    class="viewport"
    :class="{ 'help-menu-open': helpOpen }"
    @click.capture="onButtonClick"
    @pointerdown.capture="guardHelpMenuBackground"
    @pointerup.capture="guardHelpMenuBackground"
    @mousedown.capture="guardHelpMenuBackground"
    @mouseup.capture="guardHelpMenuBackground"
  >
    <div ref="gameSurface" class="game-surface" :inert="homeConfirm">
      <div class="viewport-controls">
        <button
          v-if="fullscreenAvailable"
          class="fullscreen-toggle"
          type="button"
          data-sfx-skip
          :aria-label="fullscreenActive ? '全画面表示をやめる' : '全画面表示にする'"
          :aria-pressed="fullscreenActive"
          @click="toggleFullscreen"
        >
          {{ fullscreenActive ? 'もどす' : '全画面' }}
        </button>
        <button
          class="sound-toggle"
          type="button"
          data-sfx-skip
          :aria-label="muted ? '音をオンにする' : '音をオフにする'"
          :title="muted ? '音をオンにする' : '音をオフにする'"
          :aria-pressed="!muted"
          @click="sfx.toggle()"
        >
          <SoundIcon :muted="muted" />
        </button>
      </div>
      <p v-if="fullscreenNotice" class="fullscreen-notice" role="status">
        {{ fullscreenNotice }}
      </p>
      <ScreenFrame v-if="screen === 'home'" label="ホーム画面" :background="backgroundImage">
        <FruitHero />
        <p class="home-description">
          <span>てんいんさんがしつもんして、おきゃくさんのえらんだ</span
          ><span>「きもちのくだもの」をあてるゲームです！</span>
        </p>
        <ImageButton class="start-button" :src="startButton" alt="スタート" @click="startGame" />
      </ScreenFrame>

      <ScreenFrame v-else-if="screen === 'terms'" label="利用規約画面" :background="backgroundImage">
        <h1 class="terms-title">利用規約</h1>
        <div class="terms-body" tabindex="0" aria-label="利用規約本文">
          <p>
            この規約（以下、「本規約」といいます。）は、本サービスを利用する全ての方（以下、「利用者」といいます。）が、武庫川女子大学和泉ゼミ・榎並ゼミの提供する「おしゃべりきもちのくだものやさん」（以下、「本サービス」といいます。）をご利用頂く際の取扱いにつき定めるものです。本規約に同意した上で本サービスをご利用ください。
          </p>
          <p>
            <strong>第1条（適用）</strong
            ><br />1.本規約は、利用者と当ゼミとの間の本サービスの利用に関わる一切の関係に適用されるものとします。<br />2.当ゼミは本サービスに関し、本規約のほか、ご利用にあたってのルール等、各種の定め（以下、「個別規定」といいます。）をすることがあります。これら個別規定はその名称のいかんに関わらず、本規約の一部を構成するものとします。<br />3.本規約の規定が前条の個別規定の規定と矛盾する場合には、個別規定において特段の定めなき限り、個別規定の規定が優先されるものとします。
          </p>
          <p>
            <strong>第2条（禁止事項）</strong
            ><br />利用者は、本サービスの利用にあたり、以下の行為をしてはなりません。<br />1.法令または公序良俗に違反する行為<br />2.犯罪行為に関連する行為<br />3.本サービスに含まれる知的財産権を侵害する行為<br />4.サーバーまたはネットワークの機能を破壊・妨害する行為<br />5.本サービスによって得られた情報を商業的に利用する行為<br />6.本サービスの運営を妨害するおそれのある行為<br />7.不正アクセスをし、またはこれを試みる行為<br />8.不正な目的を持って本サービスを利用する行為<br />9.その他、当ゼミが不適切と判断する行為
          </p>
          <p>
            <strong>第3条（保証の否認および免責事項）</strong
            ><br />1.当ゼミは、本サービスに事実上または法律上の瑕疵がないことを保証しておりません。<br />2.当ゼミは、本サービスに起因して利用者に生じた損害について、当ゼミの故意又は重過失による場合を除き、一切の責任を負いません。
          </p>
          <p>
            <strong>第4条（サービス内容の変更等）</strong
            ><br />当ゼミは、利用者への事前の告知をもって、本サービスの内容を変更、追加または廃止することがあり、利用者はこれを承諾するものとします。
          </p>
          <p>
            <strong>第5条（権利義務の譲渡の禁止）</strong
            ><br />利用者は、本規約に基づく権利または義務を第三者に譲渡し、または担保に供することはできません。
          </p>
          <p>
            <strong>第6条（個人情報の取り扱い）</strong
            ><br />当ゼミは、本サービスの利用にあたり、利用者の個人情報（氏名、メールアドレス等）の取得および保存は一切行いません。
          </p>
          <p>以上</p>
        </div>
        <button class="terms-action terms-back" type="button" @click="back">もどる</button>
        <button class="terms-action terms-agree" type="button" @click="go('guide')">同意する</button>
      </ScreenFrame>

      <ScreenFrame v-else-if="screen === 'guide'" label="ゲーム説明案内" :background="how1">
        <div class="speech intro-speech">
          <span>いまから　あそびかたを　せつめいするね！</span>
        </div>
        <NavArrow direction="back" @click="back" /><NavArrow @click="go('how1')" />
      </ScreenFrame>

      <ScreenFrame
        v-else-if="howScreens.includes(screen)"
        :class="{ 'how-three-screen': screen === 'how3' }"
        :label="`あそびかた ${howScreens.indexOf(screen) + 1}`"
        :background="howBackgrounds[screen]"
      >
        <div class="step-badge">あそびかた　{{ howScreens.indexOf(screen) + 1 }} / ４</div>
        <div v-if="screen === 'how1'" class="lesson lesson-one">
          おみせには、ちょっとふしぎな「きもちのくだもの」が　ならんでいます。<br />うれしい、さみしい、いろんな「きもち」。<br />くだものたちは、みんな　それぞれちがう「きもち」を　もっています。
        </div>
        <div v-if="screen === 'how2'" class="lesson lesson-two">
          おきゃくさんは、くだものを　ひとつ　えらびます。<br />えらんだくだものが　もっている「きもち」を<br />よくおぼえておきます。
        </div>
        <div v-if="screen === 'how3'" class="lesson lesson-three">
          つぎに　てんいんさんは、きめられた　しつもんを　しながら、<br />おきゃくさんが　えらんだ　くだものの『きもち』を　あてます。
        </div>
        <div v-if="screen === 'how3'" class="how3-conversation">
          <div class="how3-dialogue how3-clerk" role="group" aria-label="てんいんさんのしつもん">
            <p><QuestionText :text="howThreeExampleQuestion" /></p>
          </div>
          <div class="how3-dialogue how3-customer" role="group" aria-label="おきゃくさんのこたえのれい">
            <p>わぁ！っていう　おと！</p>
          </div>
        </div>
        <div v-if="screen === 'how4'" class="lesson lesson-four">
          「どんなときに　そのきもちに　なるかな？」と<br />かんがえたり、おはなししたり　することが<br />たいせつな　ゲームです。
        </div>
        <NavArrow direction="back" @click="back" /><NavArrow
          @click="screen === 'how4' ? go('roles') : go(howScreens[howScreens.indexOf(screen) + 1])"
        />
      </ScreenFrame>

      <ScreenFrame
        v-else-if="helpScreens.includes(screen)"
        :class="{
          'how-three-screen': screen === 'help3',
          'help-three-screen': screen === 'help3'
        }"
        :label="`ヘルプ あそびかた ${helpScreens.indexOf(screen) + 1}`"
        :background="helpBackgrounds[screen]"
      >
        <div class="step-badge">あそびかた　{{ helpScreens.indexOf(screen) + 1 }} / ４</div>
        <div v-if="screen === 'help1'" class="lesson help-lesson help-lesson-one">
          ふたりで　おきゃくさんと　てんいんさんに　わかれよう。
        </div>
        <div v-if="screen === 'help2'" class="lesson help-lesson help-lesson-two">
          くだものを　ひとつ　えらんで、ゆびを　のせよう。<br />ゆびを　はなさず　<ruby
            class="katakana-ruby register-word"
            ><span class="register-base">レジ</span><rt>れじ</rt></ruby
          >まで　うごかして、はなしてね。<br />えらんだ　くだものの　きもちを　おぼえておこう！
        </div>
        <div v-if="screen === 'help3'" class="lesson help-lesson help-lesson-three">
          つぎに　てんいんさんが　おきゃくさんに　きめられた　しつもんを　するよ。<br />おきゃくさんは　えらんだ　くだものの　きもちに　なりきって、<br />しつもんに　こたえよう！
        </div>
        <div v-if="screen === 'help3'" class="how3-conversation">
          <div class="how3-dialogue how3-clerk" role="group" aria-label="てんいんさんのしつもん">
            <p><QuestionText :text="howThreeExampleQuestion" /></p>
          </div>
          <div class="how3-dialogue how3-customer" role="group" aria-label="おきゃくさんのこたえのれい">
            <p>わぁ！っていう　おと！</p>
          </div>
        </div>
        <div v-if="screen === 'help4'" class="lesson help-lesson help-lesson-four">
          てんいんさんが　おきゃくさんの　えらんだ　くだものを<br />あてられたら、せいこう！
        </div>
        <NavArrow
          v-if="screen !== 'help1'"
          direction="back"
          @click="screen = helpScreens[helpScreens.indexOf(screen) - 1]"
        />
        <NavArrow v-if="screen !== 'help4'" @click="screen = helpScreens[helpScreens.indexOf(screen) + 1]" />
        <button v-else class="help-complete" type="button" aria-label="あそびかたを閉じる" @click="closeHelp">
          <img :src="helpCompleteButton" alt="" />
        </button>
      </ScreenFrame>

      <ScreenFrame v-else-if="screen === 'roles'" label="役割を決める画面" :background="rolesBg">
        <HelpMenu :open="helpOpen" @toggle="helpOpen = !helpOpen" @guide="go('how1')" @home="openHomeConfirm" />
        <div class="lesson roles-copy">
          さっそくゲームをはじめよう！<br />ふたりで　おきゃくさんと　てんいんさんの<br />どちらにするか　きめてね。
        </div>
        <NavArrow direction="back" @click="back" /><NavArrow @click="go('courses')" />
      </ScreenFrame>

      <ScreenFrame v-else-if="screen === 'courses'" label="コース選択画面" :background="courseBg">
        <HelpMenu :open="helpOpen" @toggle="helpOpen = !helpOpen" @guide="go('how1')" @home="openHomeConfirm" />
        <h1 class="course-title">つぎに　やりたいコースを　えらんでね！</h1>
        <div class="course-list">
          <button v-for="id in ['easy', 'hard', 'mix']" :key="id" type="button" @click="selectCourse(id)">
            <span class="course-art" :class="'course-art--' + id">
              <img :src="courseImages[id]" :alt="courseLabels[id]" />
            </span>
          </button>
        </div>
        <NavArrow direction="back" @click="back" />
      </ScreenFrame>

      <ScreenFrame v-else-if="screen === 'courseConfirm'" label="コース確認画面" :background="confirmBg">
        <HelpMenu :open="helpOpen" @toggle="helpOpen = !helpOpen" @guide="go('how1')" @home="openHomeConfirm" />
        <h1 class="confirm-title">このコースに　チャレンジする？</h1>
        <img class="chosen-course" :src="courseImages[selectedCourse]" :alt="courseLabels[selectedCourse]" /><button
          class="choice no"
          type="button"
          @click="back"
        >
          <img :src="yesImage" alt="いいえ" /></button
        ><button class="choice yes" type="button" @click="go('customerHandoff')">
          <img :src="noImage" alt="はい" />
        </button>
      </ScreenFrame>

      <ScreenFrame
        v-else-if="screen === 'customerHandoff'"
        label="お客さんに渡してね画面"
        :background="customerHandoff"
      >
        <HelpMenu :open="helpOpen" @toggle="helpOpen = !helpOpen" @guide="go('how1')" @home="openHomeConfirm" />
        <div class="lesson handoff-copy">
          はじめは、おきゃくさんの　ばんです。<br />おきゃくさんが　スマホを　もってね。<br />てんいんさんに　みえないように、くだものを　ひとつ　えらぼう。
        </div>
        <NavArrow direction="back" @click="back" /><NavArrow @click="go('customerShop')" />
      </ScreenFrame>

      <ScreenFrame
        v-else-if="screen === 'customerShop' || screen === 'clerkShop'"
        :label="screen === 'customerShop' ? 'お客さんの商品選択画面' : '店員さんの商品選択画面'"
        :background="screen === 'clerkShop' ? shopping : shopBg"
      >
        <HelpMenu :open="helpOpen" @toggle="helpOpen = !helpOpen" @guide="go('how1')" @home="openHomeConfirm" />
        <button
          v-if="screen === 'clerkShop'"
          class="question-sign"
          type="button"
          aria-label="しつもんをみる"
          @click="questionPreviewOpen = true"
        >
          しつもんを<br />みる
        </button>
        <div class="fruit-grid" :class="{ 'fruit-grid--clerk': screen === 'clerkShop' }">
          <div
            v-for="(fruit, index) in displayedFruits"
            :key="fruit.id"
            class="fruit-slot"
            :style="fruitSlotStyle(index, screen === 'clerkShop')"
          >
            <FruitCard
              :fruit="fruit"
              :drop-zone="dropZone"
              :disabled="dragDisabled"
              :picked="keyboardFruit?.id === fruit.id"
              @drop="onFruitDrop"
              @drag-change="onDragChange"
              @keyboard-pick="keyboardFruit = $event"
            /><span
              :class="{
                'fruit-feeling--multiline': fruit.feeling.includes('\n')
              }"
              >{{ fruit.feeling }}</span
            >
          </div>
        </div>
        <button
          ref="dropZone"
          class="drop-zone"
          type="button"
          data-sfx-kind="drop"
          :class="{
            'drop-zone--active': dragging || keyboardFruit,
            'drop-zone--over': overBasket
          }"
          :aria-label="keyboardFruit ? `${keyboardFruit.fruitName}をレジへ運ぶ` : 'くだものをレジへ運ぶ'"
          :aria-disabled="!keyboardFruit || dragDisabled"
          @click="!dragDisabled && selectFruit(keyboardFruit)"
        >
          <div v-if="screen === 'clerkShop'" class="timer">のこり　{{ formattedTime }}</div>
        </button>
        <p class="sr-only" aria-live="polite">
          {{ keyboardFruit ? `${keyboardFruit.fruitName}をえらびました。レジのボタンで確定できます。` : '' }}
        </p>
        <div
          v-if="screen === 'clerkShop' && remainingSeconds > 0 && remainingSeconds <= 60 && !oneMinuteAcknowledged"
          class="one-minute-warning"
        >
          <p>あと１ぷん！</p>
          <button type="button" @click="oneMinuteAcknowledged = true">わかった</button>
        </div>
        <div v-if="screen === 'clerkShop' && remainingSeconds === 0 && !timeUpAcknowledged" class="time-up-warning">
          <p>じかんぎれ！<br />くだものを　ひとつ　えらんでね</p>
          <button type="button" @click="timeUpAcknowledged = true">わかった</button>
        </div>
        <div
          v-if="screen === 'clerkShop' && questionPreviewOpen"
          class="question-preview-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="しつもんのかくにん"
          @click="questionPreviewOpen = false"
        >
          <button
            class="question-preview-close"
            type="button"
            aria-label="しつもんを閉じる"
            @click.stop="questionPreviewOpen = false"
          >
            <img :src="helpCloseButton" alt="" />
          </button>
          <div class="question-card question-preview-card">
            <span>しつもん{{ questionNumber }}</span>
            <p><QuestionText :text="questionText" /></p>
          </div>
        </div>
      </ScreenFrame>

      <ScreenFrame
        v-else-if="screen === 'customerConfirm' || screen === 'productConfirm'"
        label="商品確認画面"
        :background="shopBg"
      >
        <HelpMenu :open="helpOpen" @toggle="helpOpen = !helpOpen" @guide="go('how1')" @home="openHomeConfirm" />
        <div class="confirm-card">
          <div class="big-fruit" role="img" :aria-label="`${selectedFruit?.fruitName}、${selectedFruit?.feeling}`">
            <span class="big-fruit-emoji">{{ selectedFruit?.emoji }}</span>
            <span class="big-fruit-face">•ᴗ•</span>
          </div>
          <p class="confirmed-feeling">{{ selectedFruit?.feeling }}</p>
          <h1>このくだもので　いい？</h1>
          <div class="confirm-actions">
            <button type="button" @click="back">いいえ</button
            ><button
              type="button"
              :data-sfx-skip="screen === 'productConfirm' ? '' : null"
              @click="screen === 'customerConfirm' ? go('clerkHandoff') : judge()"
            >
              はい
            </button>
          </div>
        </div>
      </ScreenFrame>

      <ScreenFrame
        v-else-if="screen === 'clerkHandoff'"
        label="店員さんにスマホを渡す画面"
        :background="backgroundImage"
      >
        <HelpMenu :open="helpOpen" @toggle="helpOpen = !helpOpen" @guide="go('how1')" @home="openHomeConfirm" />
        <div class="lesson center-message">
          つぎは、てんいんさんの　ばんだよ！<br />てんいんさんに　スマホを　わたそう！
          <div class="phone">📱</div>
        </div>
        <NavArrow direction="back" @click="back" /><NavArrow @click="go('clerkRules')" />
      </ScreenFrame>

      <ScreenFrame v-else-if="screen === 'clerkRules'" label="店員さんのルール説明" :background="backgroundImage">
        <HelpMenu :open="helpOpen" @toggle="helpOpen = !helpOpen" @guide="go('how1')" @home="openHomeConfirm" />
        <div class="lesson center-message">
          てんいんさんは、おきゃくさんが　えらんだ<br />くだものの　きもちを　あてよう！<br />つぎの　がめんに　でてくる　しつもんを<br />おきゃくさんに　しよう！
        </div>
        <NavArrow direction="back" @click="back" /><NavArrow @click="go('question')" />
      </ScreenFrame>

      <ScreenFrame
        v-else-if="screen === 'question' || screen === 'questionConfirm'"
        label="質問画面"
        :background="shopBg"
      >
        <HelpMenu :open="helpOpen" @toggle="helpOpen = !helpOpen" @guide="go('how1')" @home="openHomeConfirm" />
        <div class="question-card">
          <span>しつもん{{ questionNumber }}</span>
          <p><QuestionText :text="questionText" /></p>
        </div>

        <template v-if="screen === 'question'">
          <NavArrow direction="back" @click="back" />
          <NavArrow @click="go('productIntro')" />
        </template>

        <div v-else class="question-actions">
          <button @click="back">もういちど</button>
          <button @click="go('productIntro')">つぎへ</button>
        </div>
      </ScreenFrame>

      <ScreenFrame v-else-if="screen === 'productIntro'" label="商品説明画面" :background="shopping">
        <HelpMenu :open="helpOpen" @toggle="helpOpen = !helpOpen" @guide="go('how1')" @home="openHomeConfirm" />
        <div class="instruction-panel">
          <p>そのうごきになる　くだものを<br />ゆびで　レジまで　はこんでね！<br />じかんは　3ふんかんだよ！</p>
          <button @click="go('clerkShop')">はじめる</button>
        </div>
      </ScreenFrame>

      <ScreenFrame v-else-if="screen === 'success'" label="正解画面" :background="backgroundImage">
        <HelpMenu :open="helpOpen" @toggle="helpOpen = !helpOpen" @guide="go('how1')" @home="openHomeConfirm" />
        <div class="final-failure-screen success">
          <h1>せいかい！</h1>
          <br />
          <p>
            「{{ correctFruit?.feeling }}」ってどんなきもち？<br />
            <span v-if="selectedEmotion && emotionExamples[selectedEmotion]">
              {{ emotionExamples[selectedEmotion] }}
            </span>
          </p>

          <button type="button" @click="resetHome">ホームへもどる</button>
          <button type="button" @click="retryGame">もういちどあそぶ</button>
        </div>
      </ScreenFrame>
      <ScreenFrame v-else-if="screen === 'failure'" label="失敗画面" :background="backgroundImage">
        <HelpMenu :open="helpOpen" @toggle="helpOpen = !helpOpen" @guide="go('how1')" @home="openHomeConfirm" />
        <div class="failure-screen">
          <h1>しっぱい……。</h1>
          <p>もういちど　おきゃくさんに　しつもんを　してみよう！<br />チャンスは　あと{{ attempts }}かい！</p>
          <button type="button" @click="go('question')">もういっかい！</button>
        </div>
      </ScreenFrame>
      <ScreenFrame v-else-if="screen === 'finalFailure'" label="最終失敗画面" :background="backgroundImage">
        <HelpMenu :open="helpOpen" @toggle="helpOpen = !helpOpen" @guide="go('how1')" @home="openHomeConfirm" />
        <div class="final-failure-screen">
          <h1>しっぱい……。</h1>
          <p>せいかいは「{{ correctFruit?.feeling }}」でした…。<br />また　ちょうせんしてね！</p>
          <button type="button" @click="resetHome">ホームへもどる</button>
          <button type="button" @click="retryGame">もういちどあそぶ</button>
        </div>
      </ScreenFrame>
    </div>
    <div v-if="homeConfirm" class="modal-backdrop">
      <div
        ref="homeDialog"
        class="home-modal"
        role="dialog"
        tabindex="-1"
        aria-modal="true"
        aria-labelledby="home-modal-title"
        aria-describedby="home-modal-description"
      >
        <h2 id="home-modal-title">
          <ruby>ホーム<rt>ほーむ</rt></ruby
          >に　もどりますか？
        </h2>
        <p id="home-modal-description">
          <ruby>ゲーム<rt>げーむ</rt></ruby
          >を　やめて、<ruby>ホーム<rt>ほーむ</rt></ruby
          >がめんに　もどります。
        </p>
        <div class="home-modal-actions">
          <button class="home-modal-no" @click="cancelHomeConfirm">いいえ</button>
          <button class="home-modal-yes" @click="resetHome">はい</button>
        </div>
      </div>
    </div>
  </main>
</template>

<script>
export default {
  data() {
    return {
      screen: 'home',
      selectedFruit: null,
      selectedEmotion: null,
      staffEmotion: null,
      attempts: 3
    };
  },

  methods: {
    // お客さんがくだものを選んだときに呼ばれる処理
    chooseFruit(fruit) {
      this.selectedFruit = fruit;
      this.selectedEmotion = fruit.feeling;
    },

    chooseStaffFruit(fruit) {
      this.staffEmotion = fruit.feeling;
    },

    finalFail() {
      this.screen = 'finalFailure';
    },

    retryGame() {
      this.screen = 'customerShop';
      this.attempts = 3;
    },

    resetHome() {
      this.screen = 'home';
      this.selectedFruit = null;
      this.selectedEmotion = null;
      this.attempts = 3;
    },

    // 画面遷移の共通処理
    go(next) {
      this.screen = next;
    },

    back() {
      // あなたの既存の戻る処理
    },

    judge() {
      const isCorrect = this.selectedEmotion === this.staffEmotion;

      if (isCorrect) {
        this.go('finalSuccess');
      } else {
        this.finalFail();
      }
    }
  }
};
</script>

<style>
.orange-button {
  background: #ffb84d;
  border: 3px solid #ffb84d;
  border-radius: 16px;
  padding: 12px 24px;
  font-size: 20px;
  font-weight: bold;
  color: #333;
  cursor: pointer;
}

.button-row {
  display: flex;
  justify-content: center;
  gap: 24px;
  margin-top: calc(1 * var(--scene-unit));
}

/* ⭐ オレンジボタン（文字が確実に見える設定） */
.button-row button {
  background: #ffb84d !important; /* オレンジ背景を強制 */
  border: 3px solid #ffb84d !important;
  border-radius: 16px;
  padding: 12px 24px;
  font-size: 20px;
  font-weight: bold;
  color: #333 !important; /* ⭐ 黒文字に変更（絶対に見える） */
  cursor: pointer;
}

.button-row button:hover {
  background: #ffa733 !important;
}

.message {
  font-size: 20px; /* 他の画面と同じサイズに揃える */
  line-height: 1.8; /* 読みやすい行間 */
}

.result-card {
  background: #fff;
  border: 4px solid #ffb84d; /* ⭐ オレンジの枠 */
  border-radius: 20px; /* 角丸 */
  padding: 24px;
  width: 90%;
  max-width: 480px;
  margin: 0 auto; /* 中央に配置 */
  text-align: center;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1); /* ふんわり影 */
}

.button-row button:hover {
  background: #ffe6ec; /* ほんのり色が変わる */
}

.drop-zone {
  position: absolute;
  right: 2.5%;
  bottom: 3%;
  width: 23%;
  height: 39%;
  border-radius: 18px;
  z-index: 20;
}

.success-title {
  text-align: center; /* ⭐ 中央寄せ */
  width: 100%; /* 横幅いっぱいに広げる */
  margin: 20px 0; /* 上下の余白 */
  font-size: 28px; /* 見やすい大きさ */
  font-weight: bold; /* 太字 */
}
</style>
