# cg-team-project

## 🔗 배포 링크
[Play Game](https://2024149070.github.io/cg-team-project/prototype_back.html)

[JH](https://2024149070.github.io/cg-team-project/JH/index.html)

<br>

## 🚀 workFlow

### 1. 메인 브랜치 최신화 (작업 전 필수!)
```bash
git checkout main
git pull origin main
```

### 2. 새로운 기능 브랜치 생성 및 이동
```bash
# git checkout -b 브랜치-이름
git checkout -b player-jump
```

### 3. 작업 후 커밋, 업로드
```bash
git add .
git commit -m "플레이어 점프 기능 구현 및 중력 적용"
git push origin player-jump
```

### 4. Pull Request 생성
1. **[Compare & pull request]** 버튼을 클릭
2. 내용에 연결된 issue 번호 달기 (예: `Closes #1`)
3. **[Create pull request]** 버튼 클릭

### 5. 팀원 피드백, 병합
1. **리뷰어:** [Review changes] → **Approve**를 선택
2. **작업자:** [Merge pull request] 버튼 클릭

### 6. 모든 작업 동기화 (로컬 정리)
```bash
git checkout main
git pull origin main
git branch -d <작업중이던-브랜치> # 로컬에서 작업했던 브랜치 삭제
```
