# Responsive Behavior Guide

## 📱 How Components Adapt Across Screen Sizes

### Navigation Bar

**Desktop (1024px+)**
```
[Logo] [Dashboard] [Gamification] [Mentor] [Kanban] [Profile] [Theme] [Notifications]
```

**Mobile (< 768px)**
```
[☰ Menu] [Logo]                                    [Theme] [Notifications]

(Hamburger menu opens slide-in drawer with all links)
```

---

### Dashboard Stats Grid

**Desktop (1024px+)**
```
┌─────────┬─────────┬─────────┬─────────┐
│ Stat 1  │ Stat 2  │ Stat 3  │ Stat 4  │
└─────────┴─────────┴─────────┴─────────┘
```

**Tablet (768px)**
```
┌─────────┬─────────┐
│ Stat 1  │ Stat 2  │
├─────────┼─────────┤
│ Stat 3  │ Stat 4  │
└─────────┴─────────┘
```

**Mobile (< 480px)**
```
┌─────────────────┐
│     Stat 1      │
├─────────────────┤
│     Stat 2      │
├─────────────────┤
│     Stat 3      │
├─────────────────┤
│     Stat 4      │
└─────────────────┘
```

---

### Forms

**Desktop**
```
┌──────────────────────────────────────┐
│ Name:     [____________]  Email: [____________] │
│ Phone:    [____________]  City:  [____________] │
│                                      │
│           [Submit Button]            │
└──────────────────────────────────────┘
```

**Mobile**
```
┌──────────────────┐
│ Name:            │
│ [______________] │
│                  │
│ Email:           │
│ [______________] │
│                  │
│ Phone:           │
│ [______________] │
│                  │
│ City:            │
│ [______________] │
│                  │
│ [Submit Button]  │
└──────────────────┘
```

---

### Kanban Board

**Desktop**
```
┌──────────┬──────────┬──────────┬──────────┐
│  To Do   │  Doing   │  Review  │   Done   │
│          │          │          │          │
│ [Card 1] │ [Card 3] │ [Card 5] │ [Card 7] │
│ [Card 2] │ [Card 4] │ [Card 6] │ [Card 8] │
└──────────┴──────────┴──────────┴──────────┘
```

**Mobile (Horizontal Scroll)**
```
┌──────────┬──────────┬──────────┬──────────┐
│  To Do   │  Doing   │  Review  │   Done   │→
│          │          │          │          │
│ [Card 1] │ [Card 3] │ [Card 5] │ [Card 7] │
│ [Card 2] │ [Card 4] │ [Card 6] │ [Card 8] │
└──────────┴──────────┴──────────┴──────────┘
← Swipe to scroll →
```

---

### Timetable

**Desktop**
```
┌──────┬──────────┬──────────┬────────┬─────────┐
│ Time │ Activity │ Subject  │ Status │ Actions │
├──────┼──────────┼──────────┼────────┼─────────┤
│ 9:00 │ Study    │ Math     │ Done   │ [✓] [✗] │
│10:00 │ Break    │ -        │ Active │ [✓] [✗] │
└──────┴──────────┴──────────┴────────┴─────────┘
```

**Mobile (Scrollable)**
```
┌──────┬──────────┬──────────┬────────┬─────────┐
│ Time │ Activity │ Subject  │ Status │ Actions │→
├──────┼──────────┼──────────┼────────┼─────────┤
│ 9:00 │ Study    │ Math     │ Done   │ [✓] [✗] │
│10:00 │ Break    │ -        │ Active │ [✓] [✗] │
└──────┴──────────┴──────────┴────────┴─────────┘
← Swipe to scroll →
```

---

### Quiz Interface

**Desktop**
```
┌─────────────────────────────────────────────┐
│ Progress: [████████░░░░] 8/12  Timer: 05:23 │
├──────────┬──────────────────────────────────┤
│          │ Question 8:                      │
│ [1][2][3]│ What is the capital of France?   │
│ [4][5][6]│                                  │
│ [7][8][9]│ ○ A. London                      │
│ [10][11] │ ● B. Paris                       │
│ [12]     │ ○ C. Berlin                      │
│          │ ○ D. Madrid                      │
│          │                                  │
│          │ [Previous] [Next]                │
└──────────┴──────────────────────────────────┘
```

**Mobile**
```
┌─────────────────────────────────┐
│ Progress: [████████░░░░] 8/12   │
│ Timer: 05:23                    │
├─────────────────────────────────┤
│ [1][2][3][4][5][6][7][8][9][10] │
│ [11][12]                        │
├─────────────────────────────────┤
│ Question 8:                     │
│ What is the capital of France?  │
│                                 │
│ ○ A. London                     │
│ ● B. Paris                      │
│ ○ C. Berlin                     │
│ ○ D. Madrid                     │
│                                 │
│ [Previous]                      │
│ [Next]                          │
└─────────────────────────────────┘
```

---

### Heatmap Grid

**Desktop (53 weeks)**
```
    Jan  Feb  Mar  Apr  May  Jun  Jul  Aug  Sep  Oct  Nov  Dec
Mon [■][■][■][■][■][■][■][■][■][■][■][■][■][■][■][■][■][■][■]...
Tue [■][■][■][■][■][■][■][■][■][■][■][■][■][■][■][■][■][■][■]...
Wed [■][■][■][■][■][■][■][■][■][■][■][■][■][■][■][■][■][■][■]...
Thu [■][■][■][■][■][■][■][■][■][■][■][■][■][■][■][■][■][■][■]...
Fri [■][■][■][■][■][■][■][■][■][■][■][■][■][■][■][■][■][■][■]...
Sat [■][■][■][■][■][■][■][■][■][■][■][■][■][■][■][■][■][■][■]...
Sun [■][■][■][■][■][■][■][■][■][■][■][■][■][■][■][■][■][■][■]...
```

**Mobile (26 weeks, scrollable)**
```
    Jan  Feb  Mar  Apr  May  Jun
Mon [■][■][■][■][■][■][■][■][■]...→
Tue [■][■][■][■][■][■][■][■][■]...→
Wed [■][■][■][■][■][■][■][■][■]...→
Thu [■][■][■][■][■][■][■][■][■]...→
Fri [■][■][■][■][■][■][■][■][■]...→
Sat [■][■][■][■][■][■][■][■][■]...→
Sun [■][■][■][■][■][■][■][■][■]...→
← Swipe to scroll →
```

---

### Notification Panel

**Desktop**
```
                                    ┌──────────────────┐
                                    │ Notifications    │
                                    ├──────────────────┤
                                    │ [Mark all read]  │
                                    ├──────────────────┤
                                    │ 🔔 Task Added    │
                                    │ Math homework... │
                                    │ 2m ago      [×]  │
                                    ├──────────────────┤
                                    │ 🎉 Task Done     │
                                    │ Physics lab...   │
                                    │ 5m ago      [×]  │
                                    └──────────────────┘
```

**Mobile (Full Width)**
```
┌─────────────────────────────────┐
│ Notifications              [×]  │
├─────────────────────────────────┤
│ [Mark all read] [Clear all]     │
├─────────────────────────────────┤
│ 🔔 Task Added                   │
│ Math homework assignment        │
│ 2m ago                     [×]  │
├─────────────────────────────────┤
│ 🎉 Task Completed               │
│ Physics lab report              │
│ 5m ago                     [×]  │
└─────────────────────────────────┘
```

---

### Chatbot

**Desktop**
```
                                    ┌──────────────────┐
                                    │ AI Mentor   [×]  │
                                    ├──────────────────┤
                                    │ Hi! How can I    │
                                    │ help you today?  │
                                    │                  │
                                    │     Hello! I     │
                                    │     need help    │
                                    ├──────────────────┤
                                    │ [Type message..] │
                                    └──────────────────┘
                                           [💬]
```

**Mobile (Full Width)**
```
┌─────────────────────────────────┐
│ AI Mentor                  [×]  │
├─────────────────────────────────┤
│ Hi! How can I help you today?   │
│                                 │
│              Hello! I need help │
│                                 │
├─────────────────────────────────┤
│ [Type message...]          [→]  │
└─────────────────────────────────┘
              [💬]
```

---

## 🎯 Key Responsive Patterns

### 1. Grid Collapse
```
Desktop: 4 columns → Tablet: 2 columns → Mobile: 1 column
```

### 2. Stack Vertically
```
Desktop: Side-by-side → Mobile: Stacked
```

### 3. Horizontal Scroll
```
Desktop: Full width → Mobile: Scroll horizontally
```

### 4. Hide/Show Elements
```
Desktop: Full navigation → Mobile: Hamburger menu
```

### 5. Reorder Content
```
Desktop: Sidebar + Content → Mobile: Content first, then sidebar
```

### 6. Resize Components
```
Desktop: Large cards → Mobile: Compact cards
```

### 7. Adjust Spacing
```
Desktop: 28px padding → Mobile: 16px padding
```

### 8. Scale Typography
```
Desktop: 18px → Mobile: 15px
```

---

## 📏 Breakpoint Reference

| Screen Size | Width | Layout |
|-------------|-------|--------|
| Small Mobile | 320px - 479px | Single column, minimal spacing |
| Mobile | 480px - 767px | Single column, optimized spacing |
| Tablet | 768px - 1023px | 2 columns, medium spacing |
| Desktop | 1024px+ | 3-4 columns, full spacing |

---

## 🎨 Visual Hierarchy

### Desktop
- More whitespace
- Larger typography
- Multi-column layouts
- Hover effects
- Tooltips

### Mobile
- Compact spacing
- Smaller typography
- Single column layouts
- Touch-friendly targets
- No hover effects

---

## ✨ Interaction Changes

### Desktop
- **Click**: Mouse clicks
- **Hover**: Hover effects
- **Scroll**: Mouse wheel
- **Select**: Click to select

### Mobile
- **Tap**: Touch taps
- **Swipe**: Swipe gestures
- **Scroll**: Touch scroll
- **Select**: Tap to select

---

## 🚀 Performance

### Desktop
- Full resolution images
- All animations
- Complex layouts
- Multiple columns

### Mobile
- Optimized images
- Essential animations
- Simplified layouts
- Single column

---

**This guide shows how each component adapts to different screen sizes while maintaining functionality and usability.**
