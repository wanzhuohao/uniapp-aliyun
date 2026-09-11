<template>
  <view class="page">
    <PageHeader title="学习看板" />
    <view v-if="loading" class="state">正在汇总本机学习记录…</view>
    <template v-else-if="dashboard">
      <view class="hero-card"><text class="eyebrow">TODAY</text><text class="hero-number">{{ dashboard.today.total }}</text><text class="hero-label">今日完成题量</text><text class="hero-meta">答对：{{ dashboard.today.correct }}　正确率：{{ rateText(dashboard.today.accuracy) }}　待复习：{{ dashboard.dueCount }}</text></view>
      <view class="grid"><view class="mini-card"><text class="mini-number">{{ dashboard.streak.days }}</text><text>连续学习天数</text></view><view class="mini-card"><text class="mini-number">{{ dashboard.goal.completed }}/{{ dashboard.goal.dailyTarget }}</text><text>今日目标</text></view></view>
      <view v-if="dashboard.streak.broken" class="notice">学习记录已断档，今天重新开始吧。</view><view v-else-if="dashboard.streak.todayPending" class="notice">昨天有学习，今天完成一题即可续上连续天数。</view>
      <view class="section"><view class="section-head"><text class="title">每日题量目标</text><text class="link" @click="changeGoal">修改</text></view><view class="progress"><view class="progress-inner" :style="{ width: `${dashboard.goal.progress * 100}%` }" /></view></view>
      <view class="section"><text class="title">最近 7 天 · 分科汇总</text><view v-for="day in dashboard.days" :key="day.date" class="day-card"><view class="day-row day-total"><text>{{ day.label }}</text><text>共 {{ day.total }} 题 · 答对 {{ day.correct }} · {{ rateText(day.accuracy) }}</text></view><view v-for="subject in subjects" :key="subject.key" class="day-row subject-row"><text>{{ subject.label }}</text><text>{{ day.subjects[subject.key].total }} 题 · 答对 {{ day.subjects[subject.key].correct }}</text><text>{{ rateText(day.subjects[subject.key].accuracy) }}</text></view></view><view v-if="dashboard.empty" class="empty">还没有学习记录，完成一次练习后这里会出现趋势。</view></view>
      <view class="section challenge"><text class="title">本周挑战 · 答对 100 题</text><text class="challenge-count">{{ Math.min(dashboard.challenge.correct, 100) }}/100</text><text v-if="dashboard.challenge.achieved" class="badge">🏅 本周已达标</text><text class="muted">周 ID：{{ dashboard.challenge.weekId }}</text></view>
      <view class="limit">数据只保存在本机。清理缓存或修改系统时间会影响统计；修改目标不会追溯改变历史题量。</view>
    </template>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import PageHeader from '../../components/PageHeader.vue'
import { awaitLearningSession, learningStorageApi } from '../../utils/common/learningSession.js'
import { STORAGE_KEYS } from '../../utils/common/storageRegistry.js'
import { buildLearningDashboard } from '../../utils/common/learningStats.js'
import { resolveDashboardDue } from '../../utils/common/paperSources.js'
import { recordDiagnosticError } from '../../utils/common/diagnostics.js'
import { assertCurrentLearningGrade, openCourseGradeSession } from '../../utils/common/gradeContext.js'
import { projectLearningValue, updateLearningGradeBucket } from '../../utils/common/gradeMigration.js'
const loading=ref(true),dashboard=ref(null)
const subjects=[{key:'chinese',label:'语文'},{key:'math',label:'数学'},{key:'english',label:'英语'}]
let sessionGrade
function readProjected(key,fallback){const raw=learningStorageApi.getStorageSync(key);return projectLearningValue(key,raw===''||raw==null?fallback:raw)}
function parseJsonStorage(key){try{return JSON.parse(readProjected(key,'[]')||'[]')}catch{return []}}
function readInput(){const due=resolveDashboardDue({grade:sessionGrade,due:{chinese:(readProjected(STORAGE_KEYS.chineseMistakes,[])||[]).filter(x=>!x.mastered&&x.nextReviewAt<=Date.now()),english:(readProjected(STORAGE_KEYS.englishMistakes,[])||[]).filter(x=>!x.mastered&&x.nextReviewAt<=Date.now()),math:parseJsonStorage(STORAGE_KEYS.mathWrongBook).filter(x=>!x.mastered&&x.nextReviewAt<=Date.now())},onMissing:recordDiagnosticError});return{grade:sessionGrade,chineseLogs:readProjected(STORAGE_KEYS.chinesePracticeLogs,[])||[],englishLogs:readProjected(STORAGE_KEYS.englishPracticeLogs,[])||[],mathHistory:parseJsonStorage(STORAGE_KEYS.mathHistory),chineseDue:due.chinese,englishDue:due.english,mathDue:due.math,goal:readProjected(STORAGE_KEYS.learningGoal,null),challenge:readProjected(STORAGE_KEYS.learningChallenge,null)}}
function persistNewBadge(result,old){if(!result.challenge.badgeEarnedNow)return;const target=updateLearningGradeBucket(STORAGE_KEYS.learningChallenge,old,sessionGrade,bucket=>{const badges={...(bucket?.badges||{})};badges[result.challenge.weekId]={earnedAt:result.challenge.badgeAt};return{badges}});assertCurrentLearningGrade(sessionGrade);learningStorageApi.setStorageSync(STORAGE_KEYS.learningChallenge,target)}
function refresh(){const input=readInput();const result=buildLearningDashboard(input,new Date());persistNewBadge(result,input.challenge);dashboard.value=result}
function rateText(value){return value==null?'暂无':`${Math.round(value*100)}%`}
function changeGoal(){uni.showModal({title:'每日题量目标（10～200）',editable:true,placeholderText:String(dashboard.value.goal.dailyTarget),success(res){if(!res.confirm)return;const value=Number(res.content);if(!Number.isInteger(value)||value<10||value>200){uni.showToast({title:'请输入 10～200 的整数',icon:'none'});return}try{const raw=learningStorageApi.getStorageSync(STORAGE_KEYS.learningGoal);const target=updateLearningGradeBucket(STORAGE_KEYS.learningGoal,raw===''?undefined:raw,sessionGrade,()=>({dailyTarget:value,updatedAt:new Date().toISOString()}));assertCurrentLearningGrade(sessionGrade);learningStorageApi.setStorageSync(STORAGE_KEYS.learningGoal,target);refresh()}catch{uni.showToast({title:'年级已变化，请重新进入',icon:'none'})}}})}
onMounted(async()=>{try{await awaitLearningSession();sessionGrade=openCourseGradeSession();refresh()}catch{uni.showModal({title:'年级不可用',content:'请返回学习首页修复当前年级',showCancel:false})}finally{loading.value=false}})
</script>

<style scoped>
.page{min-height:100vh;background:#f7f5f0;padding-bottom:60rpx}.state,.empty{padding:48rpx;text-align:center;color:#8b7d65}.hero-card,.section{margin:24rpx 32rpx;padding:32rpx;background:#fff;border-radius:24rpx;box-shadow:0 6rpx 20rpx rgba(0,0,0,.05)}.hero-card{text-align:center;background:linear-gradient(135deg,#edf6fd,#fff)}.eyebrow,.hero-label,.hero-meta{display:block;color:#6b88a3}.hero-number{display:block;font-size:112rpx;font-weight:800;color:#1e5a8e}.grid{display:grid;grid-template-columns:1fr 1fr;gap:20rpx;margin:0 32rpx}.mini-card{padding:28rpx;background:#fff;border-radius:20rpx;text-align:center;color:#766b5c}.mini-number{display:block;font-size:40rpx;font-weight:bold;color:#a62d33}.notice,.limit{margin:20rpx 32rpx;padding:20rpx;border-radius:14rpx;background:#fff8e7;color:#8a6416;font-size:24rpx}.section-head,.day-row{display:flex;justify-content:space-between}.title{display:block;font-size:30rpx;font-weight:bold;margin-bottom:22rpx}.link{color:#2a7ab8}.progress{height:18rpx;background:#e8edf2;border-radius:9rpx;overflow:hidden}.progress-inner{height:100%;background:#42a5f5}.day-card{padding:14rpx 0;border-bottom:1rpx solid #ddd}.day-row{padding:9rpx 0;color:#625b52;gap:12rpx}.day-total{font-weight:bold}.subject-row{font-size:23rpx;color:#7c7468}.challenge-count{display:block;font-size:48rpx;font-weight:bold;color:#7c4dff}.badge,.muted{display:block;margin-top:12rpx}.muted{color:#999;font-size:22rpx}.limit{background:#eeeae2;color:#7c7468;line-height:1.7}
</style>
