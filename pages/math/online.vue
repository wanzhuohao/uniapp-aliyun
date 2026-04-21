<template>
  <view class="online-page">

    <!-- ===================== PHASE: SETUP ===================== -->
    <PageHeader v-if="phase === 'setup'" title="在线练习" theme="math" />
    <view v-if="phase === 'setup'" class="setup-area">

      <scroll-view scroll-y class="setup-scroll">
        <!-- 难度 -->
        <view class="setting-group">
          <text class="setting-label">难度</text>
          <view class="setting-tags">
            <view
              v-for="item in levelOptions"
              :key="item.value"
              :class="['setting-tag', selectedLevel === item.value && 'active']"
              @click="selectedLevel = item.value"
            >{{ item.label }}</view>
          </view>
        </view>

        <!-- 题型 -->
        <view class="setting-group">
          <text class="setting-label">题型</text>
          <view class="setting-tags">
            <view
              :class="['setting-tag', isAllTypesSelected && 'active']"
              @click="toggleAllTypes"
            >全选</view>
            <view
              v-for="item in typeOptions"
              :key="item.value"
              :class="['setting-tag', selectedTypes.has(item.value) && 'active']"
              @click="toggleType(item.value)"
            >{{ item.label }}</view>
          </view>
        </view>

        <!-- 特殊题型（与上面的题型互斥，只能选一个） -->
        <view class="setting-group">
          <text class="setting-label">特殊题型</text>
          <text class="setting-sublabel">选中后与上面题型互斥</text>
          <view class="special-cards">
            <view
              v-for="item in specialOptions"
              :key="item.value"
              :class="['special-card', selectedSpecial === item.value && 'active']"
              @click="selectSpecial(item.value)"
            >
              <text class="special-name">{{ item.label }}</text>
              <text class="special-desc">{{ item.desc }}</text>
            </view>
          </view>
        </view>

        <!-- 题量 -->
        <view class="setting-group">
          <text class="setting-label">题量</text>
          <view class="setting-tags">
            <view
              v-for="n in countPresets"
              :key="n"
              :class="['setting-tag', selectedCount === n && !customCountActive && 'active']"
              @click="pickPresetCount(n)"
            >{{ n }}</view>
            <view
              :class="['setting-tag', customCountActive && 'active']"
              @click="focusCustomCount"
            >自定义</view>
          </view>
          <view v-if="customCountActive" class="custom-count-row">
            <input
              class="custom-count-input"
              type="number"
              :value="customCountVal"
              placeholder="1~200"
              :focus="customInputFocus"
              @input="onCustomCountInput"
            />
            <text class="custom-count-unit">题</text>
          </view>
        </view>

        <!-- 计时 -->
        <view class="setting-group">
          <text class="setting-label">计时</text>
          <view class="setting-tags">
            <view
              :class="['setting-tag', !timerEnabled && 'active']"
              @click="timerEnabled = false"
            >关闭</view>
            <view
              v-for="t in timerOptions"
              :key="t.value"
              :class="['setting-tag', timerEnabled && timerMinutes === t.value && 'active']"
              @click="timerEnabled = true; timerMinutes = t.value"
            >{{ t.label }}</view>
          </view>
        </view>

        <!-- 说明 -->
        <view class="desc-area">
          <text class="desc">· 答完后统一交卷</text>
          <text class="desc">· 比大小题点击 ＞ 或 ＜ 按钮作答</text>
          <text v-if="timerEnabled" class="desc">· {{ timerMinutes }} 分钟时会有提醒</text>
          <text class="desc">· 结果自动保存到历史记录</text>
        </view>

        <view class="start-btn" @click="startQuiz">开始练习</view>
      </scroll-view>
    </view>

    <!-- ===================== PHASE: QUIZ ===================== -->
    <view v-if="phase === 'quiz'" class="quiz-area">
      <!-- 顶部栏 -->
      <view class="top-bar">
        <view class="back-btn" @click="confirmBack">←</view>
        <view v-if="timerEnabled" class="timer" :class="{ warn: timerWarn }">
          {{ formatTime(elapsed) }}
        </view>
        <view v-else class="timer-placeholder" />
        <view class="progress-text">{{ answeredCount }}/{{ questions.length }}</view>
      </view>

      <!-- 题目列表 -->
      <scroll-view scroll-y class="question-list" :scroll-into-view="scrollTarget">
        <view
          v-for="(q, i) in questions"
          :key="i"
          :id="'q-' + i"
          class="q-row"
          :class="{
            current: i === currentFocus,
            done: q.userAnswer !== '' && q.userAnswer !== undefined
          }"
        >
          <text class="q-index">{{ i + 1 }}.</text>

          <!-- 比大小: 数字 [＞＜] 数字 -->
          <template v-if="q.type === 'compare'">
            <text class="q-expr">{{ splitCompare(q.expr)[0] }}</text>
            <view class="compare-btns">
              <view
                :class="['cmp-btn', q.userAnswer === '＞' && 'selected']"
                @click="selectCompare(i, '＞')"
              >＞</view>
              <view
                :class="['cmp-btn', q.userAnswer === '＝' && 'selected']"
                @click="selectCompare(i, '＝')"
              >＝</view>
              <view
                :class="['cmp-btn', q.userAnswer === '＜' && 'selected']"
                @click="selectCompare(i, '＜')"
              >＜</view>
            </view>
            <text class="q-expr">{{ splitCompare(q.expr)[1] }}</text>
          </template>

          <!-- 填空: 把 __ 替换成输入框 -->
          <template v-else-if="q.type === 'fill'">
            <text v-for="(part, pi) in splitFill(q.expr)" :key="pi" class="q-expr">
              <template v-if="part === '__'">
                <input
                  class="q-input q-input-inline"
                  type="number"
                  :value="q.userAnswer"
                  :focus="i === currentFocus"
                  placeholder="?"
                  @input="onInput(i, $event)"
                  @confirm="onConfirm(i)"
                />
              </template>
              <template v-else>{{ part }}</template>
            </text>
          </template>

          <!-- 填运算符(单边): a [+/-] b = c -->
          <template v-else-if="q.type === 'fillOp'">
            <view class="fillop2-row">
              <text class="fillop2-num">{{ splitFillOp(q.expr)[0] }}</text>
              <view class="fillop2-btns">
                <view
                  :class="['fillop2-btn', q.userAnswer === '+' && 'selected']"
                  @click="selectCompare(i, '+')"
                >+</view>
                <view
                  :class="['fillop2-btn', q.userAnswer === '-' && 'selected']"
                  @click="selectCompare(i, '-')"
                >-</view>
              </view>
              <text class="fillop2-num">{{ splitFillOp(q.expr)[1] }}</text>
            </view>
          </template>

          <!-- 填运算符(双边): a [+/-] b = c [+/-] d -->
          <template v-else-if="q.type === 'fillOp2'">
            <view class="fillop2-row">
              <text class="fillop2-num">{{ splitFillOp2(q.expr)[0] }}</text>
              <view class="fillop2-btns">
                <view
                  :class="['fillop2-btn', getOp2(q, 0) === '+' && 'selected']"
                  @click="selectOp2(i, 0, '+')"
                >+</view>
                <view
                  :class="['fillop2-btn', getOp2(q, 0) === '-' && 'selected']"
                  @click="selectOp2(i, 0, '-')"
                >-</view>
              </view>
              <text class="fillop2-num">{{ splitFillOp2(q.expr)[1] }}</text>
              <view class="fillop2-btns">
                <view
                  :class="['fillop2-btn', getOp2(q, 1) === '+' && 'selected']"
                  @click="selectOp2(i, 1, '+')"
                >+</view>
                <view
                  :class="['fillop2-btn', getOp2(q, 1) === '-' && 'selected']"
                  @click="selectOp2(i, 1, '-')"
                >-</view>
              </view>
              <text class="fillop2-num">{{ splitFillOp2(q.expr)[2] }}</text>
            </view>
          </template>

          <!-- 百数表: 不规则形状填空 -->
          <template v-else-if="q.type === 'hundredChart'">
            <view class="hundred-chart" :style="{ gridTemplateColumns: `repeat(${getChartCols(q)}, 80rpx)` }">
              <template v-for="r in getChartRows(q)" :key="r">
                <template v-for="c in getChartCols(q)" :key="c">
                  <view v-if="hasChartCell(q, r-1, c-1)"
                    :class="['hc-cell', isChartCenter(q, r-1, c-1) && 'hc-center']">
                    <text v-if="isChartCenter(q, r-1, c-1)">{{ getChartVal(q, r-1, c-1) }}</text>
                    <input v-else class="hc-input" type="number"
                      :value="chartAnswer(q, `${r-1},${c-1}`)"
                      placeholder="?"
                      @input="onChartInput(i, `${r-1},${c-1}`, $event)" />
                  </view>
                  <view v-else class="hc-empty" />
                </template>
              </template>
            </view>
          </template>

          <!-- 三角自由填：6 格全空，给数字池，无唯一解 -->
          <template v-else-if="q.type === 'triangle-free'">
            <view class="shape-wrap">
              <text class="shape-hint">每边之和 = {{ shapeData(q).target }}</text>
              <text class="shape-pool">可选数字：{{ (shapeData(q).numbers || []).join('  ') }}</text>
              <view class="tri-layout">
                <view class="tri-row tri-row-1">
                  <view class="shape-circle">
                    <input class="shape-input" type="number" :value="shapeAnswer(q, 'A')" placeholder="?" @input="onShapeInput(i, 'A', $event)" />
                  </view>
                </view>
                <view class="tri-row tri-row-2">
                  <view class="shape-circle">
                    <input class="shape-input" type="number" :value="shapeAnswer(q, 'AB')" placeholder="?" @input="onShapeInput(i, 'AB', $event)" />
                  </view>
                  <view class="shape-circle">
                    <input class="shape-input" type="number" :value="shapeAnswer(q, 'AC')" placeholder="?" @input="onShapeInput(i, 'AC', $event)" />
                  </view>
                </view>
                <view class="tri-row tri-row-3">
                  <view class="shape-circle">
                    <input class="shape-input" type="number" :value="shapeAnswer(q, 'B')" placeholder="?" @input="onShapeInput(i, 'B', $event)" />
                  </view>
                  <view class="shape-circle">
                    <input class="shape-input" type="number" :value="shapeAnswer(q, 'BC')" placeholder="?" @input="onShapeInput(i, 'BC', $event)" />
                  </view>
                  <view class="shape-circle">
                    <input class="shape-input" type="number" :value="shapeAnswer(q, 'C')" placeholder="?" @input="onShapeInput(i, 'C', $event)" />
                  </view>
                </view>
              </view>
            </view>
          </template>

          <!-- 三角形填数 -->
          <template v-else-if="q.type === 'triangle'">
            <view class="shape-wrap">
              <text class="shape-hint">每边之和 = {{ shapeData(q).target }}</text>
              <view class="tri-layout">
                <!-- 第1行: A -->
                <view class="tri-row tri-row-1">
                  <view :class="['shape-circle', shapeIsShown(q, 'A') && 'shape-given']">
                    <text v-if="shapeIsShown(q, 'A')">{{ shapeData(q).vals.A }}</text>
                    <input v-else class="shape-input" type="number" :value="shapeAnswer(q, 'A')" placeholder="?" @input="onShapeInput(i, 'A', $event)" />
                  </view>
                </view>
                <!-- 第2行: AB  AC -->
                <view class="tri-row tri-row-2">
                  <view :class="['shape-circle', shapeIsShown(q, 'AB') && 'shape-given']">
                    <text v-if="shapeIsShown(q, 'AB')">{{ shapeData(q).vals.AB }}</text>
                    <input v-else class="shape-input" type="number" :value="shapeAnswer(q, 'AB')" placeholder="?" @input="onShapeInput(i, 'AB', $event)" />
                  </view>
                  <view :class="['shape-circle', shapeIsShown(q, 'AC') && 'shape-given']">
                    <text v-if="shapeIsShown(q, 'AC')">{{ shapeData(q).vals.AC }}</text>
                    <input v-else class="shape-input" type="number" :value="shapeAnswer(q, 'AC')" placeholder="?" @input="onShapeInput(i, 'AC', $event)" />
                  </view>
                </view>
                <!-- 第3行: B  BC  C -->
                <view class="tri-row tri-row-3">
                  <view :class="['shape-circle', shapeIsShown(q, 'B') && 'shape-given']">
                    <text v-if="shapeIsShown(q, 'B')">{{ shapeData(q).vals.B }}</text>
                    <input v-else class="shape-input" type="number" :value="shapeAnswer(q, 'B')" placeholder="?" @input="onShapeInput(i, 'B', $event)" />
                  </view>
                  <view :class="['shape-circle', shapeIsShown(q, 'BC') && 'shape-given']">
                    <text v-if="shapeIsShown(q, 'BC')">{{ shapeData(q).vals.BC }}</text>
                    <input v-else class="shape-input" type="number" :value="shapeAnswer(q, 'BC')" placeholder="?" @input="onShapeInput(i, 'BC', $event)" />
                  </view>
                  <view :class="['shape-circle', shapeIsShown(q, 'C') && 'shape-given']">
                    <text v-if="shapeIsShown(q, 'C')">{{ shapeData(q).vals.C }}</text>
                    <input v-else class="shape-input" type="number" :value="shapeAnswer(q, 'C')" placeholder="?" @input="onShapeInput(i, 'C', $event)" />
                  </view>
                </view>
              </view>
            </view>
          </template>

          <!-- 方形填数 -->
          <template v-else-if="q.type === 'square'">
            <view class="shape-wrap">
              <text class="shape-hint">每边之和 = {{ shapeData(q).target }}</text>
              <view class="sq-layout">
                <!-- 第1行: A  AB  B -->
                <view class="sq-row">
                  <view :class="['shape-circle', shapeIsShown(q, 'A') && 'shape-given']">
                    <text v-if="shapeIsShown(q, 'A')">{{ shapeData(q).vals.A }}</text>
                    <input v-else class="shape-input" type="number" :value="shapeAnswer(q, 'A')" placeholder="?" @input="onShapeInput(i, 'A', $event)" />
                  </view>
                  <view :class="['shape-circle', shapeIsShown(q, 'AB') && 'shape-given']">
                    <text v-if="shapeIsShown(q, 'AB')">{{ shapeData(q).vals.AB }}</text>
                    <input v-else class="shape-input" type="number" :value="shapeAnswer(q, 'AB')" placeholder="?" @input="onShapeInput(i, 'AB', $event)" />
                  </view>
                  <view :class="['shape-circle', shapeIsShown(q, 'B') && 'shape-given']">
                    <text v-if="shapeIsShown(q, 'B')">{{ shapeData(q).vals.B }}</text>
                    <input v-else class="shape-input" type="number" :value="shapeAnswer(q, 'B')" placeholder="?" @input="onShapeInput(i, 'B', $event)" />
                  </view>
                </view>
                <!-- 第2行: DA  (空)  BC -->
                <view class="sq-row">
                  <view :class="['shape-circle', shapeIsShown(q, 'DA') && 'shape-given']">
                    <text v-if="shapeIsShown(q, 'DA')">{{ shapeData(q).vals.DA }}</text>
                    <input v-else class="shape-input" type="number" :value="shapeAnswer(q, 'DA')" placeholder="?" @input="onShapeInput(i, 'DA', $event)" />
                  </view>
                  <view class="shape-empty" />
                  <view :class="['shape-circle', shapeIsShown(q, 'BC') && 'shape-given']">
                    <text v-if="shapeIsShown(q, 'BC')">{{ shapeData(q).vals.BC }}</text>
                    <input v-else class="shape-input" type="number" :value="shapeAnswer(q, 'BC')" placeholder="?" @input="onShapeInput(i, 'BC', $event)" />
                  </view>
                </view>
                <!-- 第3行: D  CD  C -->
                <view class="sq-row">
                  <view :class="['shape-circle', shapeIsShown(q, 'D') && 'shape-given']">
                    <text v-if="shapeIsShown(q, 'D')">{{ shapeData(q).vals.D }}</text>
                    <input v-else class="shape-input" type="number" :value="shapeAnswer(q, 'D')" placeholder="?" @input="onShapeInput(i, 'D', $event)" />
                  </view>
                  <view :class="['shape-circle', shapeIsShown(q, 'CD') && 'shape-given']">
                    <text v-if="shapeIsShown(q, 'CD')">{{ shapeData(q).vals.CD }}</text>
                    <input v-else class="shape-input" type="number" :value="shapeAnswer(q, 'CD')" placeholder="?" @input="onShapeInput(i, 'CD', $event)" />
                  </view>
                  <view :class="['shape-circle', shapeIsShown(q, 'C') && 'shape-given']">
                    <text v-if="shapeIsShown(q, 'C')">{{ shapeData(q).vals.C }}</text>
                    <input v-else class="shape-input" type="number" :value="shapeAnswer(q, 'C')" placeholder="?" @input="onShapeInput(i, 'C', $event)" />
                  </view>
                </view>
              </view>
            </view>
          </template>

          <!-- 普通加减/连加减: 算式 = 输入框 -->
          <template v-else>
            <text class="q-expr">{{ q.expr }} =</text>
            <input
              class="q-input"
              type="number"
              :value="q.userAnswer"
              :focus="i === currentFocus"
              placeholder="?"
              @input="onInput(i, $event)"
              @confirm="onConfirm(i)"
            />
          </template>
        </view>
      </scroll-view>

      <!-- 提交按钮 -->
      <view class="submit-bar">
        <view class="submit-btn" @click="submitAll">交卷</view>
      </view>
    </view>

    <!-- ===================== PHASE: RESULT ===================== -->
    <view v-if="phase === 'result'" class="result-area">
      <view class="result-header">
        <view class="result-check">
          <text class="result-check-mark">{{ accuracy >= 80 ? '✓' : accuracy >= 60 ? '◎' : '◇' }}</text>
        </view>
        <text class="result-tag">DONE</text>
        <view class="result-score-row">
          <text class="result-score-num">{{ correctCount }}</text>
          <text class="result-score-slash">/</text>
          <text class="result-score-total">{{ questions.length }}</text>
        </view>
        <view class="result-meta">
          <text class="result-accuracy">{{ accuracy }}% 正确率</text>
          <text v-if="timerEnabled" class="result-dot">·</text>
          <text v-if="timerEnabled" class="result-time">{{ formatTime(finalTime) }}</text>
        </view>
      </view>

      <view class="result-actions">
        <view class="action-btn primary" @click="restart">再来一次</view>
        <view class="action-btn" @click="goHome">回到首页</view>
      </view>

      <!-- 错题回顾 -->
      <view v-if="wrongList.length > 0" class="wrong-section">
        <text class="wrong-title">错题回顾（{{ wrongList.length }} 题）</text>
        <view v-for="(w, i) in wrongList" :key="i" class="wrong-item">
          <!-- 百数表错题 -->
          <template v-if="w.type === 'hundredChart'">
            <view class="wrong-chart-block">
              <text class="wrong-expr">{{ w.index + 1 }}. 百数表（中间{{ chartDataStatic(w.expr).center }}）</text>
              <view class="wrong-chart-mini" :style="{ gridTemplateColumns: `repeat(${chartDataStatic(w.expr).cols}, 52rpx)` }">
                <template v-for="r in chartDataStatic(w.expr).rows" :key="r">
                  <template v-for="c in chartDataStatic(w.expr).cols" :key="c">
                    <text v-if="`${r-1},${c-1}` in chartDataStatic(w.expr).cellMap"
                      :class="['wrong-chart-cell', `${r-1},${c-1}` === chartDataStatic(w.expr).centerKey ? 'given' : 'answer']"
                    >{{ chartDataStatic(w.expr).cellMap[`${r-1},${c-1}`] }}</text>
                    <view v-else class="wrong-chart-empty" />
                  </template>
                </template>
              </view>
            </view>
          </template>
          <!-- 三角自由填错题：展示推荐答案 + 数字池 -->
          <template v-else-if="w.type === 'triangle-free'">
            <view class="wrong-chart-block">
              <text class="wrong-expr">{{ w.index + 1 }}. 三角自由填（每边和={{ shapeDataStatic(w.expr).target }}）</text>
              <text class="wrong-sub">数字池：{{ (shapeDataStatic(w.expr).numbers || []).join('  ') }}</text>
              <text class="wrong-sub">以下是一种推荐填法（答案不唯一）：</text>
              <view class="wrong-tri">
                <view class="wt-row wt-row-1">
                  <text class="wt-c answer">{{ shapeDataStatic(w.expr).vals.A }}</text>
                </view>
                <view class="wt-row wt-row-2">
                  <text class="wt-c answer">{{ shapeDataStatic(w.expr).vals.AB }}</text>
                  <text class="wt-c answer">{{ shapeDataStatic(w.expr).vals.AC }}</text>
                </view>
                <view class="wt-row wt-row-3">
                  <text class="wt-c answer">{{ shapeDataStatic(w.expr).vals.B }}</text>
                  <text class="wt-c answer">{{ shapeDataStatic(w.expr).vals.BC }}</text>
                  <text class="wt-c answer">{{ shapeDataStatic(w.expr).vals.C }}</text>
                </view>
              </view>
            </view>
          </template>
          <!-- 三角形错题：保持三角布局 -->
          <template v-else-if="w.type === 'triangle'">
            <view class="wrong-chart-block">
              <text class="wrong-expr">{{ w.index + 1 }}. 三角填数（每边和={{ shapeDataStatic(w.expr).target }}）</text>
              <view class="wrong-tri">
                <view class="wt-row wt-row-1">
                  <text :class="['wt-c', shapeDataStatic(w.expr).shown.includes('A') ? 'given' : 'answer']">{{ shapeDataStatic(w.expr).vals.A }}</text>
                </view>
                <view class="wt-row wt-row-2">
                  <text :class="['wt-c', shapeDataStatic(w.expr).shown.includes('AB') ? 'given' : 'answer']">{{ shapeDataStatic(w.expr).vals.AB }}</text>
                  <text :class="['wt-c', shapeDataStatic(w.expr).shown.includes('AC') ? 'given' : 'answer']">{{ shapeDataStatic(w.expr).vals.AC }}</text>
                </view>
                <view class="wt-row wt-row-3">
                  <text :class="['wt-c', shapeDataStatic(w.expr).shown.includes('B') ? 'given' : 'answer']">{{ shapeDataStatic(w.expr).vals.B }}</text>
                  <text :class="['wt-c', shapeDataStatic(w.expr).shown.includes('BC') ? 'given' : 'answer']">{{ shapeDataStatic(w.expr).vals.BC }}</text>
                  <text :class="['wt-c', shapeDataStatic(w.expr).shown.includes('C') ? 'given' : 'answer']">{{ shapeDataStatic(w.expr).vals.C }}</text>
                </view>
              </view>
            </view>
          </template>
          <!-- 方形错题：保持方形布局 -->
          <template v-else-if="w.type === 'square'">
            <view class="wrong-chart-block">
              <text class="wrong-expr">{{ w.index + 1 }}. 方形填数（每边和={{ shapeDataStatic(w.expr).target }}）</text>
              <view class="wrong-sq">
                <view class="ws-row">
                  <text :class="['wt-c', shapeDataStatic(w.expr).shown.includes('A') ? 'given' : 'answer']">{{ shapeDataStatic(w.expr).vals.A }}</text>
                  <text :class="['wt-c', shapeDataStatic(w.expr).shown.includes('AB') ? 'given' : 'answer']">{{ shapeDataStatic(w.expr).vals.AB }}</text>
                  <text :class="['wt-c', shapeDataStatic(w.expr).shown.includes('B') ? 'given' : 'answer']">{{ shapeDataStatic(w.expr).vals.B }}</text>
                </view>
                <view class="ws-row">
                  <text :class="['wt-c', shapeDataStatic(w.expr).shown.includes('DA') ? 'given' : 'answer']">{{ shapeDataStatic(w.expr).vals.DA }}</text>
                  <view class="wt-empty" />
                  <text :class="['wt-c', shapeDataStatic(w.expr).shown.includes('BC') ? 'given' : 'answer']">{{ shapeDataStatic(w.expr).vals.BC }}</text>
                </view>
                <view class="ws-row">
                  <text :class="['wt-c', shapeDataStatic(w.expr).shown.includes('D') ? 'given' : 'answer']">{{ shapeDataStatic(w.expr).vals.D }}</text>
                  <text :class="['wt-c', shapeDataStatic(w.expr).shown.includes('CD') ? 'given' : 'answer']">{{ shapeDataStatic(w.expr).vals.CD }}</text>
                  <text :class="['wt-c', shapeDataStatic(w.expr).shown.includes('C') ? 'given' : 'answer']">{{ shapeDataStatic(w.expr).vals.C }}</text>
                </view>
              </view>
            </view>
          </template>
          <!-- 其他所有题型：完整算式 + 用户答案 -->
          <template v-else>
            <text class="wrong-expr">{{ w.index + 1 }}. {{ fillAnswer(w) }}</text>
            <text class="wrong-answer">你答：{{ formatUserAnswer(w) }}</text>
          </template>
        </view>
      </view>

      <view v-else class="all-correct">
        <text class="all-correct-text">全部答对，太棒了！</text>
      </view>
    </view>

    <!-- 时间提醒弹窗 -->
    <view v-if="showTimeAlert" class="time-alert-mask" @click="showTimeAlert = false">
      <view class="time-alert-box" @click.stop>
        <text class="time-alert-text">{{ timeAlertMsg }}</text>
        <view class="time-alert-btn" @click="showTimeAlert = false">继续答题</view>
      </view>
    </view>

  </view>
</template>

<script setup>
import { ref, computed, onUnmounted } from 'vue'
import PageHeader from '../../components/PageHeader.vue'
import { generateQuestions, LEVEL_CONFIG, checkAnswer } from '../../utils/math/questionEngine.js'
import { saveRecord, recordWrong } from '../../utils/math/mathStorage.js'
import { toast } from '../../utils/common/toast.js'

// ---- 配置选项 ----
const levelOptions = [
  { value: 1, label: '20以内' },
  { value: 2, label: '100以内(整十)' },
  { value: 3, label: '100以内' },
]
const typeOptions = [
  { value: 'add',          label: '加法' },
  { value: 'sub',          label: '减法' },
  { value: 'compare',      label: '比大小' },
  { value: 'fill',         label: '填空' },
  { value: 'chain',        label: '连加连减' },
  { value: 'fillOp',       label: '填运算符' },
  { value: 'hundredChart', label: '百数表' },
  { value: 'shapeFill',   label: '图形填数' },
]
const specialOptions = [
  {
    value: 'triangleFree',
    label: '三角自由填',
    desc: '给 6 个数字，自己摆到 6 个位置，使三条边之和相等',
  },
]
const countPresets = [20, 50, 100]

// ---- 设置状态 ----
const selectedLevel = ref(1)
const selectedTypes  = ref(new Set(['add']))
const selectedSpecial = ref('')

function toggleType(val) {
  selectedSpecial.value = ''
  const s = selectedTypes.value
  if (s.has(val)) { if (s.size > 1) s.delete(val) }
  else s.add(val)
  selectedTypes.value = new Set(s)
}

const isAllTypesSelected = computed(() => selectedTypes.value.size === typeOptions.length)

function toggleAllTypes() {
  selectedSpecial.value = ''
  if (isAllTypesSelected.value) {
    selectedTypes.value = new Set([typeOptions[0].value])
  } else {
    selectedTypes.value = new Set(typeOptions.map(t => t.value))
  }
}

function selectSpecial(val) {
  if (selectedSpecial.value === val) {
    // 再次点击取消，回退到默认普通题型
    selectedSpecial.value = ''
    if (selectedTypes.value.size === 0) selectedTypes.value = new Set(['add'])
  } else {
    selectedSpecial.value = val
    selectedTypes.value = new Set()
  }
}

const selectedType = computed(() => {
  if (selectedSpecial.value) return selectedSpecial.value
  const arr = [...selectedTypes.value]
  return arr.length === typeOptions.length ? 'mix' : arr.length === 1 ? arr[0] : arr
})
const selectedCount = ref(100)
const customCountActive = ref(false)
const customCountVal    = ref('')
const customInputFocus  = ref(false)
const timerEnabled      = ref(true)
const timerMinutes      = ref(8)
const timerOptions      = [
  { value: 5, label: '5分钟' },
  { value: 8, label: '8分钟' },
  { value: 10, label: '10分钟' },
  { value: 15, label: '15分钟' },
  { value: 20, label: '20分钟' },
]

// ---- 答题状态 ----
const phase        = ref('setup')   // 'setup' | 'quiz' | 'result'
const questions    = ref([])
const currentFocus = ref(0)
const scrollTarget = ref('')

// ---- 计时器状态 ----
const elapsed       = ref(0)
const finalTime     = ref(0)
const timerWarn     = ref(false)
const showTimeAlert = ref(false)
const timeAlertMsg  = ref('')
let timer    = null
let alerted = false

// ---- 计算属性 ----
const answeredCount = computed(() =>
  questions.value.filter(q => q.userAnswer !== '' && q.userAnswer !== undefined).length
)

const correctCount = computed(() =>
  questions.value.filter(q => checkAnswer(q)).length
)

const accuracy = computed(() => {
  if (!questions.value.length) return 0
  return Math.round(correctCount.value / questions.value.length * 100)
})

const wrongList = computed(() =>
  questions.value
    .map((q, i) => ({ ...q, index: i }))
    .filter(q => !checkAnswer(q))
)

// ---- 题量设置 ----
function pickPresetCount(n) {
  selectedCount.value = n
  customCountActive.value = false
  customCountVal.value = ''
}

function focusCustomCount() {
  customCountActive.value = true
  customInputFocus.value = true
  if (!customCountVal.value) {
    customCountVal.value = String(selectedCount.value)
  }
}

function onCustomCountInput(e) {
  customCountVal.value = e.detail.value
  const n = parseInt(e.detail.value)
  if (!isNaN(n) && n >= 1 && n <= 200) {
    selectedCount.value = n
  }
}

// ---- 开始练习 ----
function startQuiz() {
  let count = selectedCount.value
  if (customCountActive.value) {
    const n = parseInt(customCountVal.value)
    if (isNaN(n) || n < 1 || n > 200) {
      toast.error('题量需在 1~200 之间')
      return
    }
    count = n
  }

  const raw = generateQuestions({
    level: selectedLevel.value,
    count,
    questionType: selectedType.value,
  })

  // 每题附加 userAnswer 字段
  questions.value = raw.map(q => ({ ...q, userAnswer: '' }))

  currentFocus.value = 0
  scrollTarget.value = ''
  elapsed.value = 0
  finalTime.value = 0
  timerWarn.value = false
  alerted = false
  showTimeAlert.value = false

  phase.value = 'quiz'

  if (timerEnabled.value) {
    const alertSeconds = timerMinutes.value * 60
    timer = setInterval(() => {
      elapsed.value++
      if (elapsed.value === alertSeconds && !alerted) {
        alerted = true
        timerWarn.value = true
        timeAlertMsg.value = `已经 ${timerMinutes.value} 分钟了，加油！`
        showTimeAlert.value = true
      }
    }, 1000)
  }
}

// ---- 答题交互 ----
// 把比大小 "8 ○ 11" 拆成 ["8", "11"]
function splitCompare(expr) {
  const parts = expr.split('○').map(s => s.trim())
  return parts.length === 2 ? parts : [expr, '']
}

// 把填空题 "1 + __ = 42" 拆成 ["1 + ", "__", " = 42"]
function splitFill(expr) {
  const idx = expr.indexOf('__')
  if (idx === -1) return [expr]
  return [expr.slice(0, idx), '__', expr.slice(idx + 2)]
}

// 填运算符 "14 ○ 6 = 8" 拆成 ["14 ", " 6 = 8"]
function splitFillOp(expr) {
  const parts = expr.split('○').map(s => s.trim())
  return parts.length === 2 ? parts : [expr, '']
}

// 双边填运算符 "5 ○ 3 = 12 ○ 4" 拆成 ["5 ", " 3 = 12 ", " 4"]
function splitFillOp2(expr) {
  const parts = expr.split('○').map(s => s.trim())
  return parts.length === 3 ? parts : [expr, '', '']
}

// 获取双边填运算符第 idx 个选择（0=左,1=右）
function getOp2(q, idx) {
  if (!q._op2Answers) return ''
  return q._op2Answers[idx] || ''
}

// 选择双边填运算符
function selectOp2(qIndex, opIdx, symbol) {
  const q = questions.value[qIndex]
  if (!q._op2Answers) q._op2Answers = ['', '']
  q._op2Answers[opIdx] = symbol
  q.userAnswer = q._op2Answers.join(',')
  // 两个都选了才自动前进
  if (q._op2Answers[0] && q._op2Answers[1]) {
    const total = questions.value.length
    if (qIndex < total - 1) {
      currentFocus.value = qIndex + 1
      scrollTarget.value = 'q-' + (qIndex + 1)
    }
  }
}

// 百数表辅助 (不规则形状)
function parseChartData(q) {
  try { return JSON.parse(q.expr) } catch { return { center: 0, rows: 0, cols: 0, cellMap: {}, centerKey: '', hiddenKeys: [] } }
}

function getChartRows(q) { return parseChartData(q).rows || 0 }
function getChartCols(q) { return parseChartData(q).cols || 0 }

function hasChartCell(q, r, c) {
  const data = parseChartData(q)
  return `${r},${c}` in data.cellMap
}

function isChartCenter(q, r, c) {
  const data = parseChartData(q)
  return `${r},${c}` === data.centerKey
}

function getChartVal(q, r, c) {
  const data = parseChartData(q)
  return data.cellMap[`${r},${c}`] || ''
}

function chartAnswer(q, key) {
  if (!q._chartAnswers) return ''
  return q._chartAnswers[key] || ''
}

function onChartInput(qIndex, key, e) {
  const q = questions.value[qIndex]
  if (!q._chartAnswers) q._chartAnswers = {}
  q._chartAnswers[key] = e.detail.value
  const data = parseChartData(q)
  q.userAnswer = JSON.stringify(data.hiddenKeys.map(k => q._chartAnswers[k] || ''))
}

// 图形填数辅助 (三角/方形共用)
function shapeData(q) {
  try { return JSON.parse(q.expr) } catch { return { target: 0, vals: {}, shown: [], hidden: [] } }
}

function shapeIsShown(q, key) {
  return shapeData(q).shown.includes(key)
}

function shapeAnswer(q, key) {
  if (!q._shapeAnswers) return ''
  return q._shapeAnswers[key] || ''
}

function onShapeInput(qIndex, key, e) {
  const q = questions.value[qIndex]
  if (!q._shapeAnswers) q._shapeAnswers = {}
  q._shapeAnswers[key] = e.detail.value
  const data = shapeData(q)
  q.userAnswer = JSON.stringify(data.hidden.map(k => q._shapeAnswers[k] || ''))
}

function onInput(index, e) {
  questions.value[index].userAnswer = e.detail.value
}

function onConfirm(index) {
  const total = questions.value.length
  if (index < total - 1) {
    currentFocus.value = index + 1
    scrollTarget.value = 'q-' + (index + 1)
  }
}

function selectCompare(index, symbol) {
  questions.value[index].userAnswer = symbol
  // 自动前进到下一题
  const total = questions.value.length
  if (index < total - 1) {
    currentFocus.value = index + 1
    scrollTarget.value = 'q-' + (index + 1)
  }
}

// ---- 交卷 ----
function submitAll() {
  uni.showModal({
    title: '确认交卷',
    content: `已答 ${answeredCount.value}/${questions.value.length} 题，确定交卷？`,
    success(res) {
      if (res.confirm) doSubmit()
    },
  })
}

function doSubmit() {
  stopTimer()
  finalTime.value = elapsed.value

  // 保存历史记录
  try {
    saveRecord({
      type: 'online',
      level: selectedLevel.value,
      questionType: selectedType.value,
      total: questions.value.length,
      correct: correctCount.value,
      elapsed: finalTime.value,
      questions: questions.value.map(q => ({
        expr: q.expr,
        answer: q.answer,
        type: q.type,
        userAnswer: q.userAnswer,
        isCorrect: checkAnswer(q),
      })),
    })
  } catch (e) {
    console.error('保存记录失败', e)
  }

  // 错题写入错题本
  for (const q of questions.value) {
    if (!checkAnswer(q)) {
      recordWrong({ expr: q.expr, answer: q.answer, type: q.type || 'add' })
    }
  }

  phase.value = 'result'
}

// ---- 结果页操作 ----
function restart() {
  phase.value = 'setup'
  questions.value = []
  elapsed.value = 0
}

function goHome() {
  stopTimer()
  uni.reLaunch({ url: '/pages/math/index' })
}

// ---- 返回 ----
function goBack() {
  stopTimer()
  uni.navigateBack()
}

function confirmBack() {
  uni.showModal({
    title: '退出练习',
    content: '确定退出？当前进度不会保存。',
    success(res) {
      if (res.confirm) {
        stopTimer()
        phase.value = 'setup'
        questions.value = []
        elapsed.value = 0
      }
    },
  })
}

// ---- 工具 ----
function stopTimer() {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}

function formatTime(s) {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

// 结果页: 解析百数表 JSON
function chartDataStatic(exprStr) {
  try { return JSON.parse(exprStr) } catch { return { center: 0, grid: [], shown: [], hidden: [] } }
}

// 结果页: 格式化用户的错误答案
function formatUserAnswer(w) {
  const ua = w.userAnswer
  if (ua === '' || ua === undefined) return '未填'
  // 双边运算符: "+,-" → "+ 和 -"
  if (w.type === 'fillOp2') return ua.replace(',', ' 和 ')
  return ua
}

// 结果页: 解析图形填数
function shapeDataStatic(exprStr) {
  try { return JSON.parse(exprStr) } catch { return { target: 0, vals: {}, shown: [], hidden: [] } }
}

// 结果页: 把正确答案填入算式，统一简洁风格
function fillAnswer(w) {
  // 双边运算符: a ○ b = c ○ d → a + b = c - d
  if (w.type === 'fillOp2') {
    const ops = (w.answer || '').split(',')
    const parts = w.expr.split('○')
    if (parts.length === 3 && ops.length === 2) {
      return `${parts[0].trim()} ${ops[0]} ${parts[1].trim()} ${ops[1]} ${parts[2].trim()}`
    }
  }
  // 单边运算符: a ○ b = c → a - b = c
  if (w.type === 'fillOp') return w.expr.replace('○', w.answer)
  // 填空: __ + 3 = 10 → 7 + 3 = 10
  if (w.expr.includes('__')) return w.expr.replace('__', w.answer)
  // 比大小: 8 ○ 11 → 8 ＜ 11
  if (w.expr.includes('○')) return w.expr.replace('○', w.answer)
  // 普通加减: 3 + 5 = 8
  return `${w.expr} = ${w.answer}`
}

onUnmounted(() => {
  stopTimer()
})
</script>

<style scoped>
/* ===== 页面容器 ===== */
.online-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: #F0F4F9;
}

/* ===== SETUP ===== */
.setup-area {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.setup-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 32rpx;
  background: #fff;
  box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04);
  position: sticky;
  top: 0;
  z-index: 10;
}
.setup-title {
  font-size: 36rpx;
  font-weight: bold;
}
.placeholder {
  width: 56rpx;
}

.setup-scroll {
  flex: 1;
  padding: 24rpx 32rpx 80rpx;
}

.setting-group {
  position: relative;
  background: #fff;
  border-radius: 20rpx;
  padding: 28rpx 28rpx 20rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 4rpx 14rpx rgba(30,90,142,0.05);
  border: 2rpx solid #D8E4F0;
}
.setting-group::before {
  content: '';
  position: absolute;
  left: 0;
  top: 24rpx;
  bottom: 24rpx;
  width: 4rpx;
  background: linear-gradient(180deg, #42A5F5, #1E88E5);
  border-radius: 0 4rpx 4rpx 0;
}
.setting-label {
  font-size: 28rpx;
  font-weight: 900;
  color: #0F2B48;
  margin-bottom: 18rpx;
  display: block;
  letter-spacing: 2rpx;
}
.setting-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}
.setting-tag {
  padding: 12rpx 28rpx;
  border-radius: 24rpx;
  font-size: 26rpx;
  background: #fff;
  color: #6B88A3;
  border: 2rpx solid #D8E4F0;
  box-shadow: 0 2rpx 6rpx rgba(30,90,142,0.03);
  transition: all 0.2s cubic-bezier(.4,0,.2,1);
  font-family: 'Courier New', 'Consolas', monospace;
  letter-spacing: 1rpx;
}
.setting-tag:active { transform: scale(0.95); }
.setting-tag.active {
  background: linear-gradient(135deg, #42A5F5, #1E88E5);
  color: #fff;
  border-color: transparent;
  font-weight: bold;
  box-shadow: 0 4rpx 12rpx rgba(66,165,245,0.25);
}

.setting-sublabel {
  display: block;
  font-size: 22rpx;
  color: #999;
  margin: -8rpx 0 14rpx;
}
.special-cards {
  display: flex;
  flex-direction: column;
  gap: 14rpx;
}
.special-card {
  padding: 22rpx 24rpx;
  border-radius: 14rpx;
  background: #F7FAFD;
  border: 2rpx solid #D8E4F0;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  transition: all 0.2s;
}
.special-card:active { transform: scale(0.98); }
.special-card.active {
  background: linear-gradient(135deg, #E3F0FA, #C7E2F5);
  border-color: #42A5F5;
  box-shadow: 0 4rpx 12rpx rgba(66,165,245,0.15);
}
.special-name {
  font-size: 28rpx;
  font-weight: bold;
  color: #0F2B48;
}
.special-card.active .special-name { color: #1E5A8E; }
.special-desc {
  font-size: 22rpx;
  color: #6B88A3;
  line-height: 1.5;
}

.custom-count-row {
  display: flex;
  align-items: center;
  margin-top: 16rpx;
  gap: 12rpx;
}
.custom-count-input {
  width: 180rpx;
  height: 64rpx;
  border: 3rpx solid #42A5F5;
  border-radius: 12rpx;
  text-align: center;
  font-size: 32rpx;
  font-weight: bold;
  background: #fff;
  color: #1E5A8E;
  font-family: 'Courier New', 'Consolas', monospace;
}
.custom-count-unit {
  font-size: 26rpx;
  color: #6B88A3;
  font-family: 'Courier New', 'Consolas', monospace;
}

.desc-area {
  background: #fff;
  border: 2rpx solid #D8E4F0;
  border-radius: 20rpx;
  padding: 24rpx 32rpx;
  margin-bottom: 32rpx;
  box-shadow: 0 4rpx 14rpx rgba(30,90,142,0.04);
}
.desc {
  display: block;
  font-size: 26rpx;
  color: #6B88A3;
  line-height: 1.9;
}

.start-btn {
  text-align: center;
  padding: 28rpx;
  background: linear-gradient(135deg, #42A5F5, #1E88E5);
  color: #fff;
  border-radius: 40rpx;
  font-size: 36rpx;
  font-weight: bold;
  box-shadow: 0 8rpx 24rpx rgba(66,165,245,0.35);
  margin: 0 8rpx 40rpx;
}
.start-btn:active { transform: scale(0.97); }

/* ===== QUIZ ===== */
.quiz-area {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 28rpx;
  background: #fff;
  box-shadow: 0 2rpx 8rpx rgba(30,90,142,0.06);
  position: sticky;
  top: 0;
  z-index: 10;
  border-bottom: 2rpx solid #D8E4F0;
}
.back-btn {
  font-size: 34rpx;
  width: 56rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #E3F0FA;
  color: #1E5A8E;
  font-weight: bold;
  cursor: pointer;
  transition: transform 0.2s;
}
.back-btn:active { transform: scale(0.9); }

.timer {
  font-size: 40rpx;
  font-weight: 900;
  font-family: 'Courier New', 'Consolas', monospace;
  color: #1E5A8E;
  letter-spacing: 2rpx;
}
.timer.warn { color: #E53935; }
.timer-placeholder {
  width: 120rpx;
}
.progress-text {
  font-size: 26rpx;
  color: #2A7AB8;
  font-weight: bold;
  font-family: 'Courier New', 'Consolas', monospace;
  letter-spacing: 2rpx;
}

.question-list {
  flex: 1;
  padding: 16rpx 24rpx;
  padding-bottom: 140rpx;
}

.q-row {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 20rpx 24rpx;
  margin-bottom: 12rpx;
  background: #fff;
  border: 2rpx solid #D8E4F0;
  border-radius: 14rpx;
  border-left: 6rpx solid transparent;
  box-shadow: 0 2rpx 8rpx rgba(30,90,142,0.04);
  transition: all 0.2s;
}
.q-row.current {
  border-left-color: #42A5F5;
  background: #E3F0FA;
  border-color: #42A5F5;
  box-shadow: 0 4rpx 14rpx rgba(66,165,245,0.15);
}
.q-row.done {
  border-left-color: #42A5F5;
}

.q-index {
  font-size: 22rpx;
  color: #8EA8BF;
  width: 44rpx;
  text-align: right;
  flex-shrink: 0;
  font-family: 'Courier New', 'Consolas', monospace;
  font-weight: bold;
}
.q-expr {
  font-size: 36rpx;
  font-weight: 900;
  flex-shrink: 0;
  color: #0F2B48;
  font-family: 'Courier New', 'Consolas', monospace;
  letter-spacing: 1rpx;
}
.q-input {
  width: 110rpx;
  height: 64rpx;
  border: 3rpx solid #D8E4F0;
  border-radius: 12rpx;
  text-align: center;
  font-size: 36rpx;
  font-weight: 900;
  background: #fff;
  color: #1E5A8E;
  font-family: 'Courier New', 'Consolas', monospace;
  transition: border-color 0.15s;
}
.q-input:focus {
  border-color: #42A5F5;
  outline: none;
}
.q-input-inline {
  display: inline-block;
  width: 100rpx;
  height: 56rpx;
  margin: 0 4rpx;
  vertical-align: middle;
  border-bottom: 4rpx solid #42A5F5;
  border-top: none;
  border-left: none;
  border-right: none;
  border-radius: 0;
}

.compare-btns {
  display: flex;
  gap: 6rpx;
}
.cmp-btn {
  width: 60rpx;
  height: 52rpx;
  border: 2rpx solid #D8E4F0;
  border-radius: 10rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32rpx;
  font-weight: 900;
  background: #fff;
  color: #1E5A8E;
  font-family: 'Courier New', 'Consolas', monospace;
  transition: all 0.15s;
}
.cmp-btn:active { transform: scale(0.93); }
.cmp-btn.selected {
  background: #42A5F5;
  color: #fff;
  border-color: #42A5F5;
}

/* 双边填运算符紧凑布局 */
.fillop2-row {
  display: flex;
  align-items: center;
  gap: 4rpx;
}
.fillop2-num {
  font-size: 34rpx;
  font-weight: 900;
  white-space: nowrap;
  color: #0F2B48;
  font-family: 'Courier New', 'Consolas', monospace;
}
.fillop2-btns {
  display: flex;
  gap: 6rpx;
}
.fillop2-btn {
  width: 56rpx;
  height: 52rpx;
  border: 2rpx solid #D8E4F0;
  border-radius: 10rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32rpx;
  font-weight: 900;
  background: #fff;
  color: #1E5A8E;
  font-family: 'Courier New', 'Consolas', monospace;
  transition: all 0.15s;
}
.fillop2-btn:active { transform: scale(0.93); }
.fillop2-btn.selected {
  background: #42A5F5;
  color: #fff;
  border-color: #42A5F5;
}

/* 图形填数 (三角/方形共用) */
.shape-wrap {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  width: 100%;
}
.shape-hint {
  font-size: 24rpx;
  color: #999;
  margin-bottom: 12rpx;
}
.shape-pool {
  font-size: 26rpx;
  color: #E65100;
  font-weight: bold;
  margin-bottom: 12rpx;
  letter-spacing: 2rpx;
}
.shape-circle {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  border: 3rpx solid #ccc;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 30rpx;
  font-weight: bold;
  background: #FFF8E1;
}
.shape-given {
  background: #E3F2FD;
  color: #1565C0;
  border-color: #90CAF9;
}
.shape-empty {
  width: 72rpx;
  height: 72rpx;
}
.shape-input {
  width: 60rpx;
  height: 60rpx;
  text-align: center;
  font-size: 26rpx;
  font-weight: bold;
  border: none;
  background: transparent;
}

/* 三角形布局 */
.tri-layout {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
}
.tri-row {
  display: flex;
  justify-content: center;
  gap: 16rpx;
}
.tri-row-2 {
  gap: 16rpx;
}

/* 方形布局 */
.sq-layout {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}
.sq-row {
  display: flex;
  justify-content: center;
  gap: 16rpx;
}

/* 百数表不规则网格 */
.hundred-chart {
  display: grid;
  gap: 0;
}
.hc-cell {
  width: 80rpx;
  height: 80rpx;
  border: 2rpx solid #ccc;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32rpx;
  font-weight: bold;
  background: #FFF8E1;
}
.hc-center {
  background: #E3F2FD;
  color: #1565C0;
}
.hc-empty {
  width: 80rpx;
  height: 80rpx;
}
.hc-input {
  width: 70rpx;
  height: 70rpx;
  text-align: center;
  font-size: 28rpx;
  font-weight: bold;
  border: none;
  background: transparent;
}

.cmp-btn.selected {
  background: #42A5F5;
  color: #fff;
  border-color: #42A5F5;
}

/* 提交栏 */
.submit-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 20rpx 32rpx;
  background: #fff;
  box-shadow: 0 -4rpx 12rpx rgba(30,90,142,0.08);
  border-top: 2rpx solid #D8E4F0;
  z-index: 10;
}
.submit-btn {
  text-align: center;
  padding: 24rpx;
  background: linear-gradient(135deg, #42A5F5, #1E88E5);
  color: #fff;
  border-radius: 40rpx;
  font-size: 32rpx;
  font-weight: 900;
  letter-spacing: 6rpx;
  box-shadow: 0 6rpx 18rpx rgba(66,165,245,0.3);
  transition: transform 0.2s;
}
.submit-btn:active { transform: scale(0.97); }

/* ===== RESULT ===== */
.result-area {
  flex: 1;
  padding: 48rpx 40rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.result-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 48rpx;
}
.result-check {
  width: 180rpx;
  height: 180rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #42A5F5, #1E88E5);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 12rpx 28rpx rgba(66,165,245,0.35);
  margin-bottom: 32rpx;
  position: relative;
}
.result-check::after {
  content: '';
  position: absolute;
  inset: -12rpx;
  border: 2rpx dashed #B8D9F0;
  border-radius: 50%;
}
.result-check-mark {
  font-size: 110rpx;
  color: #fff;
  font-weight: 900;
  line-height: 1;
  font-family: 'Courier New', 'Consolas', monospace;
}
.result-tag {
  font-size: 22rpx;
  color: #2A7AB8;
  letter-spacing: 10rpx;
  font-weight: bold;
  font-family: 'Courier New', 'Consolas', monospace;
  margin-bottom: 12rpx;
}
.result-score-row {
  display: flex;
  align-items: baseline;
  gap: 6rpx;
  margin-bottom: 16rpx;
}
.result-score-num {
  font-size: 140rpx;
  font-weight: 900;
  color: #1E5A8E;
  font-family: 'Courier New', 'Consolas', monospace;
  line-height: 1;
}
.result-score-slash {
  font-size: 72rpx;
  color: #8EA8BF;
  font-weight: bold;
}
.result-score-total {
  font-size: 72rpx;
  color: #6B88A3;
  font-weight: bold;
  font-family: 'Courier New', 'Consolas', monospace;
}
.result-meta {
  display: flex;
  align-items: center;
  gap: 12rpx;
  font-size: 28rpx;
  color: #6B88A3;
  font-family: 'Courier New', 'Consolas', monospace;
  letter-spacing: 2rpx;
}
.result-dot { opacity: 0.5; }
.result-accuracy { color: #2A7AB8; font-weight: bold; }
.result-time { color: #6B88A3; }

.result-actions {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
  width: 100%;
  max-width: 500rpx;
  margin-bottom: 48rpx;
}
.action-btn {
  text-align: center;
  padding: 24rpx;
  border-radius: 40rpx;
  font-size: 32rpx;
  font-weight: bold;
  background: #fff;
  border: 4rpx solid #E0E0E0;
  color: #333;
}
.action-btn:active { transform: scale(0.97); }
.action-btn.primary {
  background: #42A5F5;
  color: #fff;
  border-color: #42A5F5;
}

.wrong-section {
  width: 100%;
  max-width: 680rpx;
}
.wrong-title {
  font-size: 30rpx;
  font-weight: bold;
  color: #F44336;
  margin-bottom: 16rpx;
  display: block;
}
.wrong-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 18rpx 20rpx;
  margin-bottom: 10rpx;
  background: #FFEBEE;
  border-radius: 12rpx;
  font-size: 28rpx;
}
.wrong-expr {
  font-size: 28rpx;
  color: #333;
}
.wrong-answer {
  color: #F44336;
  font-size: 26rpx;
  flex-shrink: 0;
  margin-left: 12rpx;
}

/* 错题图形块（百数表/三角/方形共用） */
.wrong-chart-block {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}
.wrong-sub {
  font-size: 22rpx;
  color: #888;
  margin: 4rpx 0 8rpx;
}
.wrong-chart-mini {
  display: grid;
  gap: 2rpx;
  margin-top: 8rpx;
}
.wrong-chart-cell {
  width: 52rpx;
  height: 52rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22rpx;
  font-weight: bold;
  border-radius: 4rpx;
}
.wrong-chart-cell.given {
  background: #E3F2FD;
  color: #1565C0;
}
.wrong-chart-cell.answer {
  background: #FFEBEE;
  color: #E53935;
}
.wrong-chart-empty {
  width: 52rpx;
  height: 52rpx;
}

/* 图形填数错题 mini 布局 */
.wt-c {
  width: 44rpx;
  height: 44rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20rpx;
  font-weight: bold;
}
.wt-c.given {
  background: #E3F2FD;
  color: #1565C0;
}
.wt-c.answer {
  background: #FFF3E0;
  color: #E65100;
}
.wt-empty {
  width: 44rpx;
  height: 44rpx;
}
.wrong-tri {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 4rpx;
  margin-top: 8rpx;
}
.wt-row { display: flex; justify-content: center; gap: 8rpx; }
.wt-row-2 { gap: 8rpx; }
.wrong-sq {
  display: inline-flex;
  flex-direction: column;
  gap: 4rpx;
  margin-top: 8rpx;
}
.ws-row { display: flex; justify-content: center; gap: 8rpx; }

.all-correct {
  margin-top: 24rpx;
  padding: 32rpx 48rpx;
  background: #E8F5E9;
  border-radius: 20rpx;
}
.all-correct-text {
  font-size: 32rpx;
  color: #388E3C;
  font-weight: bold;
}

/* ===== 时间提醒弹窗 ===== */
.time-alert-mask {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}
.time-alert-box {
  background: #fff;
  border-radius: 24rpx;
  padding: 48rpx;
  text-align: center;
  width: 500rpx;
}
.time-alert-text {
  font-size: 36rpx;
  font-weight: bold;
  display: block;
  margin-bottom: 32rpx;
  color: #F44336;
}
.time-alert-btn {
  padding: 20rpx 48rpx;
  background: #42A5F5;
  color: #fff;
  border-radius: 40rpx;
  font-size: 28rpx;
  display: inline-block;
}
.time-alert-btn:active { transform: scale(0.97); }
</style>
