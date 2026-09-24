<script setup>
import { computed, ref } from 'vue'
import backgroundImage from './assets/background.png'
import guideSpeechBubble from './assets/guide-speech-bubble.png'
import startButton from './assets/start-button.png'
import guideBg from './assets/screens/guide.png'
import how1 from './assets/screens/how1.png'
import how2 from './assets/screens/how2.png'
import how3 from './assets/screens/how3.png'
import how4 from './assets/screens/how4.png'
import rolesBg from './assets/screens/roles.png'
import courseBg from './assets/screens/course-bg.png'
import courseEasy from './assets/screens/course-easy.png'
import courseHard from './assets/screens/course-hard.png'
import courseMix from './assets/screens/course-mix.png'
import confirmBg from './assets/screens/confirm-bg.png'
import yesImage from './assets/screens/yes.png'
import noImage from './assets/screens/no.png'
import customerHandoff from './assets/screens/customer-handoff.png'
import shopBg from './assets/screens/shop.png'
import FruitHero from './components/FruitHero.vue'
import ImageButton from './components/ImageButton.vue'
import ScreenFrame from './components/ScreenFrame.vue'
import NavArrow from './components/NavArrow.vue'
import HelpMenu from './components/HelpMenu.vue'
import FruitCard from './components/FruitCard.vue'

const screen = ref('home')
const history = ref([])
const helpOpen = ref(false)
const homeConfirm = ref(false)
const selectedCourse = ref('easy')
const selectedFruit = ref(null)
const attempts = ref(3)
const fruits = [
  { id: 'apple', emoji: '🍎', feeling: 'おこる' }, { id: 'orange', emoji: '🍊', feeling: 'こわい' },
  { id: 'banana', emoji: '🍌', feeling: 'あぶない' }, { id: 'grape', emoji: '🍇', feeling: 'うれしい' },
  { id: 'peach', emoji: '🍑', feeling: 'かなしい' }, { id: 'kiwi', emoji: '🥝', feeling: 'つかれる' },
  { id: 'strawberry', emoji: '🍓', feeling: 'きらく\nのんびり' }, { id: 'pear', emoji: '🍐', feeling: 'やさしい\nしんせつ' }
]
const courseImages = { easy: courseEasy, hard: courseHard, mix: courseMix }
const courseLabels = { easy: 'かんたん', hard: 'むずかしい', mix: 'ごちゃまぜ' }
const howScreens = ['how1', 'how2', 'how3', 'how4']
const howBackgrounds = { how1, how2, how3, how4 }
const questionText = computed(() => selectedCourse.value === 'hard' ? 'そのきもちに　なったとき、\nからだは　どんなうごきに　なる？' : 'そのきもちに　なったとき、\nどんな　うごきに　なる？')

function go(next) { history.value.push(screen.value); screen.value = next; helpOpen.value = false }
function back() { screen.value = history.value.pop() || 'home'; helpOpen.value = false }
function selectCourse(id) { selectedCourse.value = id; go('courseConfirm') }
function selectFruit(fruit) { selectedFruit.value = fruit; go(screen.value === 'customerShop' ? 'customerConfirm' : 'productConfirm') }
function judge() { if (selectedFruit.value?.id === 'grape') go('success'); else if (attempts.value > 1) { attempts.value--; go('failure') } else go('finalFailure') }
function resetHome() { screen.value = 'home'; history.value = []; helpOpen.value = false; homeConfirm.value = false; selectedFruit.value = null; attempts.value = 3 }
</script>

<template>
  <main class="viewport">
    <ScreenFrame v-if="screen === 'home'" label="ホーム画面" :background="backgroundImage">
      <FruitHero /><p class="home-description"><span>てんいんさんがしつもんして、おきゃくさんのえらんだ</span><span>「きもちのくだもの」をあてるゲームです！</span></p>
      <ImageButton class="start-button" :src="startButton" alt="スタート" @click="go('terms')" />
    </ScreenFrame>

    <ScreenFrame v-else-if="screen === 'terms'" label="利用規約画面" :background="backgroundImage">
      <h1 class="terms-title">利用規約</h1>
      <div class="terms-body" tabindex="0" aria-label="利用規約本文">
        <p>この規約（以下、「本規約」といいます。）は、本サービスを利用する全ての方（以下、「利用者」といいます。）が、武庫川女子大学和泉ゼミ・榎並ゼミの提供する「おしゃべりココロのくだものやさん」（以下、「本サービス」といいます。）をご利用頂く際の取扱いにつき定めるものです。本規約に同意した上で本サービスをご利用ください。</p>
        <p><strong>第1条（適用）</strong><br>1.本規約は、利用者と当ゼミとの間の本サービスの利用に関わる一切の関係に適用されるものとします。<br>2.当ゼミは本サービスに関し、本規約のほか、ご利用にあたってのルール等、各種の定め（以下、「個別規定」といいます。）をすることがあります。これら個別規定はその名称のいかんに関わらず、本規約の一部を構成するものとします。<br>3.本規約の規定が前条の個別規定の規定と矛盾する場合には、個別規定において特段の定めなき限り、個別規定の規定が優先されるものとします。</p>
        <p><strong>第2条（禁止事項）</strong><br>利用者は、本サービスの利用にあたり、以下の行為をしてはなりません。<br>1.法令または公序良俗に違反する行為<br>2.犯罪行為に関連する行為<br>3.本サービスに含まれる知的財産権を侵害する行為<br>4.サーバーまたはネットワークの機能を破壊・妨害する行為<br>5.本サービスによって得られた情報を商業的に利用する行為<br>6.本サービスの運営を妨害するおそれのある行為<br>7.不正アクセスをし、またはこれを試みる行為<br>8.不正な目的を持って本サービスを利用する行為<br>9.その他、当ゼミが不適切と判断する行為</p>
        <p><strong>第3条（保証の否認および免責事項）</strong><br>1.当ゼミは、本サービスに事実上または法律上の瑕疵がないことを保証しておりません。<br>2.当ゼミは、本サービスに起因して利用者に生じた損害について、当ゼミの故意又は重過失による場合を除き、一切の責任を負いません。</p>
        <p><strong>第4条（サービス内容の変更等）</strong><br>当ゼミは、利用者への事前の告知をもって、本サービスの内容を変更、追加または廃止することがあり、利用者はこれを承諾するものとします。</p>
        <p><strong>第5条（権利義務の譲渡の禁止）</strong><br>利用者は、本規約に基づく権利または義務を第三者に譲渡し、または担保に供することはできません。</p>
        <p><strong>第6条（個人情報の取り扱い）</strong><br>当ゼミは、本サービスの利用にあたり、利用者の個人情報（氏名、メールアドレス等）の取得および保存は一切行いません。</p>
        <p>以上</p>
      </div>
      <button class="terms-action terms-back" type="button" @click="back">もどる</button>
      <button class="terms-action terms-agree" type="button" @click="go('guide')">同意する</button>
    </ScreenFrame>

    <ScreenFrame v-else-if="screen === 'guide'" label="ゲーム説明案内" :background="guideBg">
      <div class="speech intro-speech"><img class="speech-bubble-image" :src="guideSpeechBubble" alt=""><span>いまから　あそびかたを　せつめいするね！</span></div><NavArrow direction="back" @click="back" /><NavArrow @click="go('how1')" />
    </ScreenFrame>

    <ScreenFrame v-else-if="howScreens.includes(screen)" :label="`あそびかた ${howScreens.indexOf(screen) + 1}`" :background="howBackgrounds[screen]">
      <div class="step-badge">あそびかた　{{ howScreens.indexOf(screen) + 1 }} / ４</div>
      <div v-if="screen === 'how1'" class="lesson lesson-one">おみせには、ちょっとふしぎな「きもちのくだもの」が　ならんでいます。<br>うれしい、さみしい、いろんな「きもち」。<br>くだものたちは、みんな　それぞれちがう「きもち」を　もっています。</div>
      <div v-if="screen === 'how2'" class="lesson lesson-two">おきゃくさんは、くだものを　ひとつ　えらびます。<br>えらんだくだものが　もっている「きもち」を<br>よくおぼえておきます。</div>
      <div v-if="screen === 'how3'" class="lesson lesson-three">てんいんさんは、きめられた　しつもんを　しながら、<br>おきゃくさんが　えらんだ　くだものの「きもち」を　あてます。</div>
      <div v-if="screen === 'how4'" class="lesson lesson-four">「どんなときに　そのきもちに　なるかな？」と<br>かんがえたり、おはなししたり　することが<br>たいせつな　ゲームです。</div>
      <NavArrow direction="back" @click="back" /><NavArrow @click="screen === 'how4' ? go('roles') : go(howScreens[howScreens.indexOf(screen) + 1])" />
    </ScreenFrame>

    <ScreenFrame v-else-if="screen === 'roles'" label="役割を決める画面" :background="rolesBg">
      <HelpMenu :open="helpOpen" @toggle="helpOpen = !helpOpen" @guide="go('how1')" @home="homeConfirm = true" />
      <div class="lesson roles-copy">さっそくゲームをはじめよう！<br>ふたりで　おきゃくさんと　てんいんさんの<br>どちらにするか　きめてね。</div><NavArrow direction="back" @click="back" /><NavArrow @click="go('courses')" />
    </ScreenFrame>

    <ScreenFrame v-else-if="screen === 'courses'" label="コース選択画面" :background="courseBg">
      <HelpMenu :open="helpOpen" @toggle="helpOpen = !helpOpen" @guide="go('how1')" @home="homeConfirm = true" />
      <h1 class="course-title">つぎに　やりたいコースを　えらんでね！</h1><div class="course-list"><button v-for="id in ['easy','hard','mix']" :key="id" type="button" @click="selectCourse(id)"><img :src="courseImages[id]" :alt="courseLabels[id]" /></button></div><NavArrow direction="back" @click="back" />
    </ScreenFrame>

    <ScreenFrame v-else-if="screen === 'courseConfirm'" label="コース確認画面" :background="confirmBg">
      <HelpMenu :open="helpOpen" @toggle="helpOpen = !helpOpen" @guide="go('how1')" @home="homeConfirm = true" /><h1 class="confirm-title">このコースに　チャレンジする？</h1><img class="chosen-course" :src="courseImages[selectedCourse]" :alt="courseLabels[selectedCourse]" /><button class="choice no" type="button" @click="back"><img :src="yesImage" alt="いいえ"></button><button class="choice yes" type="button" @click="go('customerHandoff')"><img :src="noImage" alt="はい"></button>
    </ScreenFrame>

    <ScreenFrame v-else-if="screen === 'customerHandoff'" label="お客さんに渡してね画面" :background="customerHandoff">
      <HelpMenu :open="helpOpen" @toggle="helpOpen = !helpOpen" @guide="go('how1')" @home="homeConfirm = true" /><div class="lesson handoff-copy">はじめは、おきゃくさんの　ばんです。<br>おきゃくさんが　スマホを　もってね。<br>てんいんさんに　みえないように、くだものを　ひとつ　えらぼう。</div><NavArrow direction="back" @click="back" /><NavArrow @click="go('customerShop')" />
    </ScreenFrame>

    <ScreenFrame v-else-if="screen === 'customerShop' || screen === 'clerkShop'" :label="screen === 'customerShop' ? 'お客さんの商品選択画面' : '店員さんの商品選択画面'" :background="shopBg">
      <HelpMenu :open="helpOpen" @toggle="helpOpen = !helpOpen" @guide="go('how1')" @home="homeConfirm = true" /><div class="fruit-grid"><div v-for="fruit in fruits" :key="fruit.id" class="fruit-slot"><FruitCard :fruit="fruit" :selected="selectedFruit?.id === fruit.id" @select="selectFruit" /><span>{{ fruit.feeling }}</span></div></div><div v-if="screen === 'clerkShop'" class="timer">のこり　03:00</div>
    </ScreenFrame>

    <ScreenFrame v-else-if="screen === 'customerConfirm' || screen === 'productConfirm'" label="商品確認画面" :background="shopBg">
      <HelpMenu :open="helpOpen" @toggle="helpOpen = !helpOpen" @guide="go('how1')" @home="homeConfirm = true" /><div class="confirm-card"><span class="big-fruit">{{ selectedFruit?.emoji }}</span><h1>このくだもので　いい？</h1><div class="confirm-actions"><button type="button" @click="back">いいえ</button><button type="button" @click="screen === 'customerConfirm' ? go('clerkHandoff') : judge()">はい</button></div></div>
    </ScreenFrame>

    <ScreenFrame v-else-if="screen === 'clerkHandoff'" label="店員さんにスマホを渡す画面" :background="backgroundImage">
      <HelpMenu :open="helpOpen" @toggle="helpOpen = !helpOpen" @guide="go('how1')" @home="homeConfirm = true" /><div class="lesson center-message">つぎは、てんいんさんの　ばんだよ！<br>てんいんさんに　スマホを　わたそう！<div class="phone">📱</div></div><NavArrow direction="back" @click="back" /><NavArrow @click="go('clerkRules')" />
    </ScreenFrame>

    <ScreenFrame v-else-if="screen === 'clerkRules'" label="店員さんのルール説明" :background="backgroundImage">
      <HelpMenu :open="helpOpen" @toggle="helpOpen = !helpOpen" @guide="go('how1')" @home="homeConfirm = true" /><div class="lesson center-message">てんいんさんは、おきゃくさんが　えらんだ<br>くだものの　きもちを　あてよう！<br>つぎの　がめんに　でてくる　しつもんを<br>おきゃくさんに　しよう！</div><NavArrow direction="back" @click="back" /><NavArrow @click="go('question')" />
    </ScreenFrame>

    <ScreenFrame v-else-if="screen === 'question' || screen === 'questionConfirm'" label="質問画面" :background="shopBg">
      <HelpMenu :open="helpOpen" @toggle="helpOpen = !helpOpen" @guide="go('how1')" @home="homeConfirm = true" /><div class="question-card"><span>しつもん１</span><p>{{ questionText }}</p></div><template v-if="screen === 'question'"><NavArrow direction="back" @click="back" /><NavArrow @click="go('questionConfirm')" /></template><div v-else class="question-actions"><button @click="back">もういちど</button><button @click="go('productIntro')">つぎへ</button></div>
    </ScreenFrame>

    <ScreenFrame v-else-if="screen === 'productIntro'" label="商品説明画面" :background="shopBg">
      <HelpMenu :open="helpOpen" @toggle="helpOpen = !helpOpen" @guide="go('how1')" @home="homeConfirm = true" /><div class="instruction-panel">そのうごきになる　くだものを<br>ゆびで　レジまで　はこんでね！<br>じかんは　3ふんかんだよ！<button @click="go('clerkShop')">はじめる</button></div>
    </ScreenFrame>

    <ScreenFrame v-else-if="screen === 'success'" label="正解画面" :background="backgroundImage"><div class="result success"><span>🎉</span><h1>せいかい！</h1><p>きもちのくだものを　みつけられたね！</p><button @click="resetHome">ホームにもどる</button></div></ScreenFrame>
    <ScreenFrame v-else-if="screen === 'failure'" label="失敗画面" :background="backgroundImage"><div class="result failure"><span>💭</span><h1>しっぱい……。</h1><p>もういちど　おきゃくさんに　しつもんを　してみよう！<br>チャンスは　あと{{ attempts }}かい！</p><button @click="go('question')">もういちど</button></div></ScreenFrame>
    <ScreenFrame v-else-if="screen === 'finalFailure'" label="最終失敗画面" :background="backgroundImage"><div class="result failure"><span>🍇</span><h1>しっぱい……。</h1><p>せいかいは「ぶどう」でした…。<br>また　ちょうせんしてね！</p><button @click="resetHome">ホームにもどる</button></div></ScreenFrame>

    <div v-if="homeConfirm" class="modal-backdrop"><div class="home-modal"><h2>ホームに　もどりますか？</h2><p>ゲームを　やめて、ホームがめんに　もどります。</p><div><button @click="homeConfirm = false">いいえ</button><button @click="resetHome">はい</button></div></div></div>
  </main>
</template>
