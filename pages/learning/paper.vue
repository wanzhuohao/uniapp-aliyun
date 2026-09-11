<template>
  <view class="page">
    <PageHeader title="综合练习卷" />
    <view v-if="phase === 'setup'" class="card setup">
      <text class="title">规则式综合组卷</text>
      <text class="desc">依据最近 7 天正确率和可解析到期错题，在语文、数学、英语之间自动分配。</text>

      <text class="label">题量</text>
      <view class="choices"><view v-for="n in [9, 12, 15]" :key="n" :class="['chip', count === n && 'active']" @click="count = n">{{ n }}题</view></view>
      <text class="label">数学难度</text>
      <view class="choices"><view v-for="item in difficulties" :key="item.value" :class="['chip', difficulty === item.value && 'active']" @click="difficulty = item.value">{{ item.label }}</view></view>
      <text v-if="!exclusiveSupported" class="warning">当前浏览器没有 Web Locks。交卷时请只保留本应用一个标签页。</text>
      <button class="primary" :disabled="busy" @click="generate">生成试卷</button>
    </view>

    <template v-else-if="phase === 'quiz'">
      <view class="progress">{{ answered }}/{{ questions.length }}　语{{ quotas.chinese }}·数{{ quotas.math }}·英{{ quotas.english }}</view>
      <view class="questions">
        <PaperQuestion v-for="(question, index) in questions" :key="`${question.subject}:${question.id}`" v-model="answers[index]" :question="question" :index="index" />
      </view>
      <button class="submit" :disabled="busy" @click="submit">{{ busy ? '正在安全交卷…' : '交卷' }}</button>
    </template>

    <view v-else class="card result">
      <text class="score">{{ score }}/{{ questions.length }}</text>
      <text class="title">交卷完成</text>
      <button @click="reset">再生成一份新卷</button>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import PageHeader from '../../components/PageHeader.vue'
import PaperQuestion from '../../components/learning/PaperQuestion.vue'
import { awaitLearningSession, getLearningSession, learningStorageApi } from '../../utils/common/learningSession.js'
import { STORAGE_KEYS } from '../../utils/common/storageRegistry.js'
import { buildLearningDashboard, localDateString } from '../../utils/common/learningStats.js'
import { buildAllPaperSources } from '../../utils/common/paperSources.js'
import { buildPaper, createPaperInstanceId, createPaperSubmissionIntent, buildPaperSubmissionTarget } from '../../utils/common/paperEngine.js'
import { applyRegisteredSnapshotTransaction } from '../../utils/common/dataBackup.js'
import { recordDiagnosticError } from '../../utils/common/diagnostics.js'
import { assertAvailableLearningGrade, openCourseGradeSession } from '../../utils/common/gradeContext.js'
import { selectLearningGrade } from '../../utils/common/gradeMigration.js'

const phase = ref('setup')
const count = ref(12)
const difficulty = ref('medium')
const busy = ref(false)
const questions = ref([])
const answers = ref([])
const quotas = ref({ math: 0, chinese: 0, english: 0 })
const score = ref(0)
const exclusiveSupported = ref(false)
const difficulties = Object.freeze([{ value: 'easy', label: '简单' }, { value: 'medium', label: '适中' }, { value: 'hard', label: '进阶' }])
const answered = computed(() => answers.value.filter(value => value !== '').length)

let session
let paperInstanceId
let seed
let frozenIntent = null
let sessionGrade

function gradeArray(key) {
  try {
    const empty = [STORAGE_KEYS.mathHistory, STORAGE_KEYS.mathWrongBook].includes(key) ? '[]' : []
    return selectLearningGrade(key, learningStorageApi.getStorageSync(key) || empty, sessionGrade)
  } catch { return [] }
}

function logsInput() {
  return {
    grade: sessionGrade,
    chineseLogs: gradeArray(STORAGE_KEYS.chinesePracticeLogs),
    englishLogs: gradeArray(STORAGE_KEYS.englishPracticeLogs),
    mathHistory: gradeArray(STORAGE_KEYS.mathHistory),
    chineseDue: [], englishDue: [], mathDue: [], goal: null, challenge: null,
  }
}

function recentSubjectStats() {
  const dashboard = buildLearningDashboard(logsInput(), new Date())
  return Object.fromEntries(['math', 'chinese', 'english'].map(subject => [subject, {
    total: dashboard.days.reduce((sum, day) => sum + day.subjects[subject].total, 0),
    correct: dashboard.days.reduce((sum, day) => sum + day.subjects[subject].correct, 0),
    dueCount: 0,
  }]))
}

function generate() {
  try { assertAvailableLearningGrade(sessionGrade) } catch {
    uni.showModal({ title: '暂时无法组卷', content: '该年级题库待补', showCancel: false })
    return
  }
  busy.value = true
  try {
    seed = `${localDateString(new Date())}|${sessionGrade}|${count.value}|${difficulty.value}`
    const due = {
      chinese: gradeArray(STORAGE_KEYS.chineseMistakes).filter(item => !item.mastered && item.nextReviewAt <= Date.now()),
      english: gradeArray(STORAGE_KEYS.englishMistakes).filter(item => !item.mastered && item.nextReviewAt <= Date.now()),
      math: gradeArray(STORAGE_KEYS.mathWrongBook).filter(item => !item.mastered && item.nextReviewAt <= Date.now()),
    }
    const sourcesResult = buildAllPaperSources({ grade: sessionGrade, difficulty: difficulty.value, seed, due, onMissing: recordDiagnosticError })
    if (!sourcesResult.ok) {
      uni.showModal({ title: '暂时无法组卷', content: '该年级题库待补', showCancel: false })
      return
    }
    const candidates = sourcesResult.candidates
    const stats = recentSubjectStats()
    for (const subject of ['math', 'chinese', 'english']) stats[subject].dueCount = candidates[subject].filter(item => item.due).length
    const result = buildPaper({ grade: sessionGrade, stats, candidates, count: count.value, difficulty: difficulty.value, seed })
    if (!result.ok) {
      const content = result.code === 'PAPER_GRADE_UNAVAILABLE' ? '该年级题库待补' : '三科可机判题目不足，请先完成更多基础练习。'
      uni.showModal({ title: '暂时无法组卷', content, showCancel: false })
      return
    }
    paperInstanceId = createPaperInstanceId()
    questions.value = result.questions
    answers.value = result.questions.map(() => '')
    quotas.value = result.quotas
    frozenIntent = null
    phase.value = 'quiz'
  } catch (error) {
    uni.showModal({ title: '组卷失败', content: `${error.message || '题源不可用'}。请刷新题库后重试。`, showCancel: false })
  } finally {
    busy.value = false
  }
}

function showCommittedRecovery() {
  uni.showModal({ title: '交卷已保存', content: '记录已保存，但存储状态需要恢复', showCancel: false })
}

async function submit() {
  if (busy.value) return
  busy.value = true
  try {
    const confirmed = await new Promise(resolve => uni.showModal({
      title: '确认交卷', content: `已答 ${answered.value}/${questions.value.length} 题，未答题按错误计。`,
      success: result => resolve(result.confirm), fail: () => resolve(false),
    }))
    if (!confirmed) return
    if (!frozenIntent) frozenIntent = await createPaperSubmissionIntent({ grade: sessionGrade, paperInstanceId, seed, questions: questions.value, answers: answers.value })
    const result = await session.runPaperMutation(context => applyRegisteredSnapshotTransaction(context, original => buildPaperSubmissionTarget(original, frozenIntent), 'paper', { sessionGrade }))
    if (!result?.ok) {
      if (result?.committed) { showCommittedRecovery(); return }
      throw new Error(result?.code || 'PAPER_SUBMISSION_INCONSISTENT')
    }
    score.value = frozenIntent.answers.filter(item => item.correct).length
    phase.value = 'result'
  } catch (error) {
    if (error?.committed) showCommittedRecovery()
    else uni.showModal({ title: '交卷未完成', content: `${error.message || '写入失败'}。请勿刷新，可关闭其他标签页后重试同一次交卷。`, showCancel: false })
  } finally {
    busy.value = false
  }
}

function reset() {
  phase.value = 'setup'
  questions.value = []
  answers.value = []
  frozenIntent = null
  paperInstanceId = null
}

onMounted(async () => {
  try {
    await awaitLearningSession()
    sessionGrade = openCourseGradeSession()
    session = getLearningSession()
    exclusiveSupported.value = session.exclusiveDataOpsSupported
  } catch {
    uni.showModal({ title: '年级不可用', content: '请返回学习首页修复当前年级', showCancel: false })
  }
})
</script>

<style scoped>
.page{min-height:100vh;background:#f4f1ea;padding-bottom:120rpx}.card{margin:28rpx 32rpx;padding:34rpx;background:#fff;border-radius:24rpx}.title,.label,.desc,.warning,.score{display:block}.title{font-size:36rpx;font-weight:bold}.desc{margin:18rpx 0;color:#7b7469;line-height:1.7}.label{margin-top:28rpx;font-weight:bold}.choices{display:flex;gap:14rpx;margin-top:14rpx}.chip{padding:16rpx 24rpx;background:#eee9df;border-radius:30rpx}.chip.active{background:#326fa3;color:#fff}.warning{margin-top:24rpx;color:#9b5d00}.primary{margin-top:32rpx;background:#326fa3;color:#fff}.progress{position:sticky;top:0;z-index:3;padding:22rpx 32rpx;background:#fff;text-align:center;color:#326fa3}.questions{display:flex;flex-direction:column;gap:22rpx;margin:24rpx 32rpx}.submit{position:fixed;bottom:20rpx;left:32rpx;right:32rpx;background:#a62d33;color:#fff}.result{text-align:center}.score{font-size:110rpx;color:#326fa3;font-weight:bold}
</style>
