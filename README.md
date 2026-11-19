<div align="center">

# SortLab

**정렬을 보고, 듣고, 비교하고, 이해하는 인터랙티브 알고리즘 실험실**

복잡한 정렬 알고리즘을 움직임과 소리로 탐색하는 웹 프로젝트.

<p>
  <a href="https://oyueo-mm.github.io/SortLab/"><strong>웹사이트 열기</strong></a>
  &nbsp;·&nbsp;
  <a href="https://github.com/oyueo-mm/SortLab/actions/workflows/pages.yml">배포 상태</a>
  &nbsp;·&nbsp;
  <a href="LICENSE">라이선스</a>
</p>

<p>
  <img alt="JavaScript" src="https://img.shields.io/badge/JavaScript-Vanilla-2563EB?style=flat-square&logo=javascript&logoColor=white">
  <img alt="Canvas 2D" src="https://img.shields.io/badge/Canvas-2D-64748B?style=flat-square">
  <img alt="GitHub Pages" src="https://img.shields.io/badge/Deploy-GitHub%20Pages-64748B?style=flat-square&logo=github">
  <img alt="MIT License" src="https://img.shields.io/badge/License-MIT-64748B?style=flat-square">
</p>

</div>

---

| **93종** | **14종** | **4개** | **7종** |
| :---: | :---: | :---: | :---: |
| 일반 정렬 | 패러디·실험 | 동시 비교 | 공개 도메인 명화 |

## 주요 기능

| | |
| :--- | :--- |
| **정렬 도감** | 93종을 9개 계열로 분류. 카드에서 정렬 과정을 자동 재생합니다. |
| **알고리즘 해설** | 각 정렬의 동작 원리, 복잡도, 안정성, 장단점과 관련 알고리즘을 살펴볼 수 있습니다. |
| **실시간 시각화** | 막대·점·원형·격자·이미지 표현, 단계 이동·되감기, 속도 조절을 지원합니다. |
| **4분할 비교** | 같은 초기 데이터로 서로 다른 알고리즘 4개를 동시에 비교합니다. |
| **이미지 정렬** | 세로 조각·타일 복원, 밝기·색상 기준 픽셀 정렬. 내 사진도 사용할 수 있습니다. |
| **정렬 사운드** | 값에 따른 음높이와 완료 효과음을 Web Audio로 재생합니다. |
| **패러디·실험** | 일반 도감과 구분해 비효율 정렬과 패러디 알고리즘 14종을 탐색합니다. |

### 도감과 해설

**도감은 움직임에, 해설은 원리에 집중합니다.**

도감 카드는 한국어·영어 이름과 애니메이션만 표시합니다. 계열마다 제목과 얇은 구분선을 두어 93종을 한눈에 살펴볼 수 있습니다.

별도의 **알고리즘 해설** 페이지에서는 3단계 작동 원리, 실제 정렬 애니메이션, 시간·공간 복잡도, 안정성, 장점과 한계를 확인할 수 있습니다.

### 시각화와 비교

- **표현:** 막대 · 점 · 원형 · 이미지
- **색상:** 레인보우 · 블루 · 퍼플 (값에 따라 색상 유지)
- **제어:** 재생 · 일시정지 · 한 단계 이동 · 되감기 · 새 배열
- **입력:** 최대 10,000개, 7가지 배열 패턴, 속도 1–200
- **비교:** 동일한 입력으로 최대 4개 알고리즘을 나란히 실행

> 큰 배열이나 계산량이 많은 알고리즘에는 개별 입력 크기 제한이 적용됩니다.

### 이미지 정렬

| 모드 | 동작 |
| :--- | :--- |
| **세로 조각** | 16–2,048개까지 세밀하게 분할해 원래 순서로 복원 |
| **타일** | 4×4 · 8×8 · 16×16 · 32×32 · 64×64 격자로 나눠 복원 |
| **픽셀** | 8×8 · 16×16 · 32×32 · 64×64 · 128×128 샘플을 밝기 또는 색상으로 재배열 |

**큰 파도·별이 빛나는 밤·모나리자·그랑드자트섬·아이리스·수련·블루 마블** 등 유명 명화·사진 7종을 기본 프리셋으로 제공합니다. 작품들은 공개 도메인 이용 조건을 확인해 최적화한 WebP로 프로젝트에 함께 저장했습니다. [출처와 이용 조건](assets/art/SOURCES.md)

세로 조각의 기본 이미지는 **큰 파도**, 타일은 **모나리자**, 픽셀 정렬은 **별이 빛나는 밤**입니다. 원본 종횡비를 유지하여 초상화도 잘리지 않습니다. 이전 호수·노을·오로라 샘플은 접을 수 있는 **기존 풍경** 메뉴에서 사용할 수 있습니다.

**PNG / JPG / WEBP / GIF** 파일을 직접 업로드할 수 있으며, 이미지 정렬은 모두 브라우저 안에서 처리합니다. 개인 사진은 서버로 업로드되지 않습니다.

**정렬되는 범위는 실제 이미지 안쪽뿐**입니다. 원본 비율을 유지한 채 중앙에 그리며, 주변의 빈 캔버스 여백은 조각이나 픽셀에 포함되지 않습니다. 포인터로 위치를 확인할 때도 이미지 안쪽에서만 조각 번호를 표시합니다. 조각 수가 많아지면 픽셀은 고속 래스터 경로로 그리고, 렌더링 갱신 빈도를 제한해 성능을 보호합니다.

일부 알고리즘(특히 버블·삽입 등 이차 시간 정렬)은 큰 배열에 안전 제한이 적용되므로 선택 크기보다 **실제로 처리하는 조각 수가 작을 수 있습니다.** 설정에 적용 크기를 표시하며, 64×64 또는 128×128처럼 높은 분할을 온전히 사용하려면 퀵·병합 등 제한이 적은 알고리즘을 선택하는 편이 좋습니다.

픽셀 모드는 *원본 복원*이 아닌 색상 재배열 효과입니다.

## 시작하기

**[설치 없이 바로 실행하기](https://oyueo-mm.github.io/SortLab/)**

로컬에서 실행하려면 저장소를 내려받은 뒤 정적 서버를 실행하세요.

```bash
git clone https://github.com/oyueo-mm/SortLab.git
cd SortLab
python3 -m http.server 4173
```

브라우저에서 **http://localhost:4173** 에 접속하면 됩니다. Windows에서는 `python3` 대신 `python` 명령을 사용할 수 있습니다.

테스트는 Node.js 22 이상에서 실행합니다.

```bash
npm test
```

별도의 패키지 설치나 빌드 과정은 필요하지 않습니다.

## 프로젝트 구조

```text
SortLab/
├── index.html            # 진입 페이지
├── styles.css            # 인터페이스
├── src/
│   ├── algorithms.js     # 알고리즘 등록·분류
│   ├── extra-frontier.js # 적응형 병합·힙·AVL
│   ├── extra-modern.js   # 고급 분할·하이브리드
│   ├── extra-specialized.js # 트라이·표본 분배
│   ├── refined-core.js   # 개선된 기존 정렬
│   ├── extra-geometry.js # 격자·트리·간접·문자열 정렬
│   ├── grid-view.js      # 2차원 격자 시각화
│   ├── art-presets.js    # 명화 7종의 출처와 기본값
│   ├── engine.js         # 단계 재생 · 되감기
│   ├── visual.js         # Canvas 시각화
│   ├── image-sort.js     # 이미지 정렬
│   ├── audio.js          # 정렬 사운드
│   ├── catalog.js        # 도감 계열 구성
│   └── guide-ui.js       # 알고리즘 해설
├── assets/art/           # 공개 도메인 명화 WebP 7종
├── scripts/              # 이미지 재생성 유틸리티
└── tests/                # 자동 테스트
```

<details>
<summary><strong>정렬 계열과 패러디·실험 안내</strong></summary>

<br>

일반 도감은 다음 9개 계열로 구분됩니다.

**기초·교환 / 삽입 / 퀵 / 병합 / 힙·트리 / 분포·기수 / 하이브리드 / 정렬 네트워크 / 기타 정렬**

패러디·실험 14종은 **스탈린, 타노스, 사회주의, 자본주의, 수면, 보조, 기적, 양자 보고, 슬로, 보고보고, 실리, 번트 팬케이크, 어닐링, 스핀더보틀 정렬**입니다.

일부 항목은 값을 삭제·변경하거나 정상적인 정렬을 완료하지 않습니다. 일부는 실제로 정렬하지만 매우 비효율적입니다. 이를 일반 정렬과 혼동하지 않도록 별도 메뉴로 분리했습니다.

기존 **Smoothsort는 실제 레오나르도 힙 알고리즘**으로 교체했습니다. PDQ·Grail·Wiki 정렬은 분할·병합 전략을 개선했지만 **원본 라이브러리의 완전한 이식이 아니라 교육용 변형**입니다. BlockQuicksort·Quadsort·Fluxsort·Crumsort·IPS⁴o·Blitsort 등 하드웨어 최적화가 핵심인 정렬도 교육용 순차 구현으로 구분했습니다.

</details>

<details>
<summary><strong>신규 알고리즘 18종과 개선된 4종</strong></summary>

<br>

| 계열 | 새로 추가한 정렬 |
| :--- | :--- |
| 병합 | Peeksort · Adaptive ShiversSort · SymMerge · 4-way Merge Sort |
| 힙·트리 | Bottom-up Heapsort · 4-ary Heapsort · AVL Tree Sort · Splay Tree Sort · Poplar-inspired Forest Heap |
| 분포·기수 | Sample Sort · Spreadsort · Burstsort 숫자 키 적응형 · IPS⁴o-inspired 표본 분할 |
| 퀵 | BlockQuicksort 블록 분할 교육형 |
| 하이브리드 | Quadsort · Fluxsort · Crumsort · Blitsort 교육형 |

**기존 개선:** PDQ 스타일 정렬에 부분 삽입·패턴 대응·힙 폴백을 보강하고, Smoothsort를 레오나르도 힙으로 교체했습니다. Grail 스타일은 √n 버퍼 병합, Wiki 스타일은 O(1) 추가 배열 회전 병합으로 개선했습니다.

Burstsort는 문자열용 원본 대신 숫자를 고정 길이 자릿수 문자열로 변환하여 트라이에서 정렬합니다. IPS⁴o는 원본 병렬·SIMD·캐시 최적화 구현이 아닌 순차 제자리 표본 분할 학습용입니다. 원본과 다른 구현은 영문 이름과 해설에 명확히 표시합니다.

</details>

<details>
<summary><strong>추가 알고리즘 12종 · 격자 및 자료구조</strong></summary>

<br>

| 계열 | 추가한 알고리즘 |
| :--- | :--- |
| 2차원 정렬 | **Shear Sort**(뱀 모양 행·열 교대) · **Column-wise Sort and Merge**(열 정렬 교육형) |
| 병합 | **Loser Tree Merge Sort**(패자 기록 비교 트리) |
| 힙·트리 | **Pairing Heap Sort** · **Red-Black Tree Sort** · **Treap Sort** |
| 기타 | **Rank Sort**(각 값의 고유 순위 계산) |
| 삽입 | **Randomized Shell Sort**(간격 처리 순서를 무작위로 섞는 교육형) |
| 하이브리드 | **Tag Sort**(인덱스 우선 간접 정렬) |
| 분포·기수 | **3-Way String Radix Quick Sort**(숫자 문자열 키 적응형) |
| 실험 | **Annealing Sort** · **Spin-the-bottle Sort**(종료 한도 있음) |

Shear Sort와 Column-wise Sort는 격자 애니메이션으로 관찰할 수 있습니다. **Column-wise Sort and Merge는 정식 8단계 Columnsort가 아니며**, Randomized Shell과 문자열 기수 퀵 정렬도 숫자 배열에 맞춘 학습용 변형입니다. 트리 기반 정렬은 실제 자료구조에 데이터를 넣고 정렬하지만 격자 이외의 별도 트리 그래프 시각화는 제공하지 않습니다.

</details>

<details>
<summary><strong>실행 제한과 기술 메모</strong></summary>

<br>

- 어닐링 정렬과 스핀더보틀 정렬은 시도 횟수가 제한된 확률 실험으로, 실패를 완료로 표시하지 않습니다. 이차 시간 정렬은 일반적으로 최대 2,000개, 보고 정렬은 5개, 보고보고 정렬은 4개, 실리 정렬은 11개, 번트 팬케이크 정렬은 80개, 스투지 정렬은 64개, 비드 정렬은 80개까지 제한됩니다. 일부 정렬 네트워크는 입력 길이를 2의 거듭제곱으로 맞춥니다.
- 되감기 이벤트는 메모리 보호를 위해 최근 약 150,000건을 유지합니다. 기록 범위를 벗어난 과거 단계는 복원할 수 없습니다.
- 이미지 파일은 10MB 이하, 원본 해상도는 4,000만 픽셀 이하이며, 업로드 이미지는 새로고침 시 유지되지 않습니다.
- 정렬 알고리즘은 비교·교환·쓰기 이벤트를 생성하고, Canvas 2D 및 Web Audio API가 이를 시각화·음향화합니다.
- `main` 브랜치에 반영되면 GitHub Actions에서 테스트한 뒤 GitHub Pages로 배포합니다.

</details>

---

<div align="center">
  <sub>Built with JavaScript · Canvas 2D · Web Audio API</sub>
</div>
