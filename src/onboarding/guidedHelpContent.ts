import type React from "react";
import { Ionicons } from "@expo/vector-icons";

export type GuidedHelpIconName = React.ComponentProps<typeof Ionicons>["name"];

export type GuidedHelpPageKey =
  | "home"
  | "search"
  | "postDetail"
  | "write"
  | "writeDrafts"
  | "bookmarks"
  | "growth"
  | "growthRecords"
  | "growthAchievements"
  | "growthQuests"
  | "me"
  | "author"
  | "notifications"
  | "accountCenter"
  | "premium";

export type GuidedHelpRequirement = "login" | "premium" | "iosOnly" | "androidLimited";

export type GuidedHelpButton = {
  key: string;
  label: string;
  iconName?: GuidedHelpIconName;
  role: string;
  requirement?: GuidedHelpRequirement;
};

export type GuidedHelpPage = {
  key: GuidedHelpPageKey;
  title: string;
  route: string;
  iconName: GuidedHelpIconName;
  summary: string;
  visibleContent: string[];
  firstVisit: string[];
  userFlow: string[];
  buttons: GuidedHelpButton[];
  nextActions: string[];
  tips: string[];
  autoShow?: boolean;
};

export const GUIDED_HELP_PAGES: Record<GuidedHelpPageKey, GuidedHelpPage> = {
  home: {
    key: "home",
    title: "홈",
    route: "/(tabs)",
    iconName: "home-outline",
    autoShow: false,
    summary:
      "글을 발견하는 기본 화면이에요. 추천, 팔로잉, 최신을 오가며 읽고 마음에 드는 글은 하트나 저장으로 남겨둘 수 있어요.",
    visibleContent: ["추천 글", "팔로잉 작가의 글", "최신 글", "검색과 알림", "오늘의 글감", "글쓰기 버튼"],
    firstVisit: [
      "상단 오른쪽에는 검색과 알림이 있어요.",
      "피드 상단의 추천, 팔로잉, 최신을 바꾸면 글 목록의 기준이 달라져요.",
      "화면 가운데 아래의 글쓰기 버튼은 새 글을 시작하는 가장 빠른 입구예요.",
    ],
    userFlow: [
      "추천 피드에서 글을 하나 읽어봅니다.",
      "마음에 들면 하트를 누르고, 다시 읽고 싶으면 저장을 누릅니다.",
      "작가가 마음에 들면 작가 프로필로 들어가 팔로우합니다.",
      "직접 쓰고 싶을 때 가운데 글쓰기 버튼을 누릅니다.",
    ],
    buttons: [
      { key: "search", label: "검색", iconName: "search-outline", role: "글, 작가, 문장, 태그를 찾습니다." },
      { key: "notifications", label: "알림", iconName: "notifications-outline", role: "내 글과 활동 반응을 확인합니다.", requirement: "login" },
      { key: "recommended", label: "추천", iconName: "sparkles-outline", role: "새 글을 발견하는 기본 피드입니다." },
      { key: "following", label: "팔로잉", iconName: "people-outline", role: "내가 팔로우한 작가의 글을 봅니다.", requirement: "login" },
      { key: "latest", label: "최신", iconName: "time-outline", role: "방금 올라온 글을 시간순으로 봅니다." },
      { key: "like", label: "하트", iconName: "heart-outline", role: "마음에 드는 글을 표시합니다." },
      { key: "bookmark", label: "저장", iconName: "bookmark-outline", role: "글을 북마크 폴더에 담습니다.", requirement: "login" },
      { key: "more", label: "더보기", iconName: "ellipsis-horizontal", role: "신고, 차단 등 안전 기능과 추가 액션을 엽니다." },
      { key: "write", label: "글쓰기", iconName: "create-outline", role: "새 글 작성을 시작합니다.", requirement: "login" },
    ],
    nextActions: ["추천 글을 하나 읽어보기", "검색으로 작가 찾기", "가운데 글쓰기 버튼 눌러보기"],
    tips: [
      "팔로잉 피드는 로그인 후 사용할 수 있어요.",
      "홈의 오늘의 글감은 글쓰기를 시작하기 어려울 때 바로 쓰기 화면으로 이어집니다.",
    ],
  },
  search: {
    key: "search",
    title: "검색",
    route: "/search",
    iconName: "search-outline",
    summary:
      "글과 작가를 함께 찾는 화면이에요. 문장 일부나 태그를 입력하고 결과를 글/작가로 나눠 확인할 수 있어요.",
    visibleContent: ["글 검색 결과", "작가 검색 결과", "최근 검색어", "인기순/최신순", "작가 정렬"],
    firstVisit: [
      "상단 입력창에 찾고 싶은 문장, 태그, 작가 이름을 넣어요.",
      "검색 후 글 탭과 작가 탭을 오가며 결과를 확인해요.",
      "최근 검색어는 내 기기에만 남고, 필요하면 지울 수 있어요.",
    ],
    userFlow: [
      "검색어를 입력하고 키보드의 검색을 누릅니다.",
      "먼저 글 결과를 인기순으로 훑어봅니다.",
      "작가를 찾는 중이면 작가 탭으로 전환합니다.",
      "마음에 드는 결과를 열어 글 상세나 작가 프로필로 이동합니다.",
    ],
    buttons: [
      { key: "query", label: "검색 입력", iconName: "search-outline", role: "찾고 싶은 문장, 태그, 작가 이름을 입력합니다." },
      { key: "posts", label: "글", iconName: "document-text-outline", role: "검색 결과를 글 중심으로 봅니다." },
      { key: "authors", label: "작가", iconName: "person-outline", role: "검색 결과를 작가 중심으로 봅니다." },
      { key: "popular", label: "인기순", iconName: "flame-outline", role: "반응이 많은 글을 먼저 봅니다." },
      { key: "latest", label: "최신순", iconName: "time-outline", role: "최근 올라온 글을 먼저 봅니다." },
      { key: "recent", label: "최근 검색어", iconName: "refresh-outline", role: "이전에 검색한 단어를 다시 실행합니다." },
    ],
    nextActions: ["좋아하는 단어로 검색하기", "작가 탭으로 전환하기", "검색 결과 글 저장하기"],
    tips: [
      "검색 결과가 글보다 작가에 더 가까우면 앱이 작가 탭을 먼저 보여줄 수 있어요.",
      "신고/차단은 검색 결과의 글 카드 더보기에서도 사용할 수 있어요.",
    ],
  },
  postDetail: {
    key: "postDetail",
    title: "글 상세",
    route: "/(tabs)",
    iconName: "reader-outline",
    summary:
      "글을 크게 읽고 반응하는 화면이에요. 하트, 저장, 사진 저장, 공유를 할 수 있고 더보기에서 안전 기능과 문장 액자를 열 수 있어요.",
    visibleContent: ["글 이미지 또는 글 카드", "제목과 본문", "작가 정보", "좋아요/저장/공유", "더보기 액션"],
    firstVisit: [
      "상단에는 뒤로가기와 더보기 메뉴가 있어요.",
      "본문 아래 또는 하단 액션 영역에서 하트, 저장, 사진 저장, 공유를 사용할 수 있어요.",
      "작가 이름이나 프로필 영역을 누르면 작가 프로필로 이동합니다.",
    ],
    userFlow: [
      "글을 읽고 마음에 들면 하트를 누릅니다.",
      "나중에 다시 읽을 글은 저장 버튼으로 폴더에 담습니다.",
      "이미지로 남기고 싶으면 사진 저장을, 다른 사람에게 보내고 싶으면 공유를 사용합니다.",
      "문장 액자는 하트 누른 글을 직접 골라 홈 위젯에 담는 흐름입니다.",
    ],
    buttons: [
      { key: "back", label: "뒤로", iconName: "chevron-back", role: "이전 화면으로 돌아갑니다." },
      { key: "author", label: "작가", iconName: "person-circle-outline", role: "작가 프로필로 이동합니다." },
      { key: "like", label: "하트", iconName: "heart-outline", role: "글을 좋아요로 표시합니다. 문장 액자 후보 조건에도 쓰입니다." },
      { key: "bookmark", label: "저장", iconName: "bookmark-outline", role: "글을 북마크 폴더에 담습니다.", requirement: "login" },
      { key: "download", label: "사진 저장", iconName: "download-outline", role: "글 이미지를 내 기기에 저장합니다." },
      { key: "share", label: "공유", iconName: "share-social-outline", role: "링크 또는 이미지를 다른 앱으로 보냅니다." },
      { key: "sentence-frame", label: "문장 액자", iconName: "albums-outline", role: "하트 누른 글을 홈 화면 위젯용 글 사진으로 선택합니다.", requirement: "premium" },
      { key: "safety", label: "신고/차단", iconName: "shield-checkmark-outline", role: "부적절한 글이나 사용자를 신고하거나 차단합니다." },
    ],
    nextActions: ["작가 프로필 열기", "마음에 드는 글 저장하기", "공유 또는 사진 저장하기"],
    tips: [
      "문장 액자는 프리미엄 active 상태에서 사용할 수 있어요.",
      "부적절한 글은 더보기에서 신고하고, 보고 싶지 않은 작가는 차단할 수 있어요.",
    ],
  },
  write: {
    key: "write",
    title: "글쓰기",
    route: "/write",
    iconName: "create-outline",
    summary:
      "본문을 쓰는 곳이면서 글 카드 모양을 만드는 곳이에요. 먼저 글을 쓰고, 미리보기에서 배경과 배치를 확인한 뒤 발행하세요.",
    visibleContent: ["제목 입력", "본문 입력", "여러 페이지", "배경 선택", "배치 조정", "미리보기", "임시저장", "발행"],
    firstVisit: [
      "처음에는 제목과 본문을 먼저 채우면 됩니다.",
      "미리보기는 독자가 보게 될 글 카드 모양을 확인하는 영역이에요.",
      "배경과 배치는 글을 다 쓴 뒤 조정해도 충분합니다.",
    ],
    userFlow: [
      "제목과 본문을 입력합니다.",
      "긴 글이면 페이지를 추가해 여러 장으로 나눕니다.",
      "미리보기에서 배경과 배치를 확인합니다.",
      "바로 공개하기 어렵다면 임시저장하고, 준비되면 발행합니다.",
    ],
    buttons: [
      { key: "close", label: "닫기", iconName: "close", role: "작성 화면을 닫습니다. 작성 중인 내용이 있으면 확인이 필요합니다." },
      { key: "draft", label: "임시저장", iconName: "save-outline", role: "작성 중인 글을 나중에 이어 쓸 수 있게 저장합니다." },
      { key: "drafts", label: "임시저장함", iconName: "file-tray-outline", role: "저장해 둔 초안을 불러옵니다." },
      { key: "preview", label: "미리보기", iconName: "eye-outline", role: "독자가 보게 될 글 카드 모양을 확인합니다." },
      { key: "background", label: "배경", iconName: "color-palette-outline", role: "글 카드 배경을 바꿉니다." },
      { key: "layout", label: "배치", iconName: "move-outline", role: "제목과 본문 위치, 크기를 조정합니다." },
      { key: "page", label: "페이지 추가", iconName: "add-circle-outline", role: "긴 글을 여러 장 이미지로 나눠 작성합니다." },
      { key: "publish", label: "발행", iconName: "send-outline", role: "글을 공개합니다." },
    ],
    nextActions: ["제목과 본문 먼저 쓰기", "미리보기로 글 카드 확인하기", "임시저장으로 이어 쓰기"],
    tips: [
      "작성 중 닫기를 누르면 작성 내용이 있을 때 확인 절차가 나와요.",
      "임시저장함에서 예전에 쓰던 글을 이어 쓸 수 있어요.",
    ],
  },
  writeDrafts: {
    key: "writeDrafts",
    title: "임시저장함",
    route: "/write-drafts",
    iconName: "file-tray-outline",
    summary:
      "아직 발행하지 않은 글이 모이는 곳이에요. 이어 쓸 글을 선택하거나 필요 없는 초안을 정리할 수 있어요.",
    visibleContent: ["저장된 초안", "초안 이어쓰기", "초안 삭제", "전체 삭제"],
    firstVisit: [
      "목록에는 아직 발행하지 않은 글 초안이 보여요.",
      "초안을 누르면 글쓰기 화면으로 돌아가 이어 쓸 수 있어요.",
      "오래된 초안은 개별 삭제하거나 전체 삭제할 수 있어요.",
    ],
    userFlow: [
      "이어 쓸 초안을 선택합니다.",
      "글쓰기 화면에서 내용을 수정합니다.",
      "필요 없는 초안은 삭제해 목록을 정리합니다.",
    ],
    buttons: [
      { key: "select", label: "초안 선택", iconName: "document-text-outline", role: "해당 글을 다시 편집합니다." },
      { key: "delete", label: "삭제", iconName: "trash-outline", role: "필요 없는 초안을 지웁니다." },
      { key: "clear", label: "전체 삭제", iconName: "close-circle-outline", role: "모든 초안을 지웁니다." },
    ],
    nextActions: ["이어 쓸 초안 열기", "오래된 초안 정리하기"],
    tips: [
      "초안 삭제는 되돌리기 어렵기 때문에 발행 전 글인지 확인하고 지우는 게 좋아요.",
    ],
  },
  bookmarks: {
    key: "bookmarks",
    title: "저장",
    route: "/bookmarks",
    iconName: "bookmark-outline",
    summary:
      "다시 읽고 싶은 글을 폴더로 정리하는 공간이에요. 글 상세나 글 카드에서 저장한 글이 여기에 모입니다.",
    visibleContent: ["북마크 폴더", "폴더별 저장 글", "폴더 생성", "폴더 수정", "폴더 삭제"],
    firstVisit: [
      "처음에는 폴더 목록이 먼저 보여요.",
      "폴더를 열면 그 안에 저장한 글 목록을 볼 수 있어요.",
      "아직 폴더가 없다면 폴더 추가로 주제별 저장 공간을 만들 수 있어요.",
    ],
    userFlow: [
      "글 상세나 글 카드에서 저장 버튼을 누릅니다.",
      "저장 탭에서 폴더를 열어 담긴 글을 확인합니다.",
      "필요하면 폴더 이름과 설명을 수정합니다.",
      "더 이상 쓰지 않는 폴더는 삭제합니다.",
    ],
    buttons: [
      { key: "create", label: "폴더 추가", iconName: "add", role: "새 저장 폴더를 만듭니다." },
      { key: "folder", label: "폴더", iconName: "folder-open-outline", role: "해당 폴더에 담긴 글을 엽니다." },
      { key: "rename", label: "수정", iconName: "create-outline", role: "폴더 이름이나 설명을 바꿉니다." },
      { key: "delete", label: "삭제", iconName: "trash-outline", role: "폴더를 삭제합니다." },
      { key: "post", label: "글 카드", iconName: "reader-outline", role: "저장한 글 상세로 이동합니다." },
    ],
    nextActions: ["폴더 만들기", "저장한 글 다시 읽기", "폴더 이름 정리하기"],
    tips: [
      "저장 탭은 로그인 후 사용할 수 있어요.",
      "글을 저장하는 순간 어떤 폴더에 담을지 고르는 흐름이 이어질 수 있어요.",
    ],
  },
  growth: {
    key: "growth",
    title: "성장",
    route: "/growth",
    iconName: "sparkles-outline",
    summary:
      "꾸준히 읽고 쓰는 흐름을 보여주는 곳이에요. 오늘의 글감으로 쓰고 기록, 업적, 퀘스트를 확인할 수 있어요.",
    visibleContent: ["레벨과 XP", "오늘의 글감 프로젝트", "기록", "업적", "퀘스트", "보상"],
    firstVisit: [
      "상단에서는 내 성장 상태와 레벨 흐름을 확인해요.",
      "오늘의 글감 프로젝트는 바로 글쓰기로 이어지는 추천 주제예요.",
      "기록, 업적, 퀘스트는 각각 더 자세한 화면으로 나뉘어 있어요.",
    ],
    userFlow: [
      "오늘의 글감을 확인합니다.",
      "이 주제로 쓰기를 눌러 글쓰기 화면으로 이동합니다.",
      "기록 보기에서 내가 쓴 글과 활동을 확인합니다.",
      "업적과 퀘스트에서 받을 수 있는 보상을 확인합니다.",
    ],
    buttons: [
      { key: "write-prompt", label: "이 주제로 쓰기", iconName: "create-outline", role: "오늘의 글감으로 글쓰기 화면을 엽니다." },
      { key: "records", label: "기록 보기", iconName: "stats-chart-outline", role: "내 글과 활동 흐름을 자세히 봅니다." },
      { key: "achievements", label: "업적", iconName: "trophy-outline", role: "달성한 것과 진행 중인 목표를 봅니다." },
      { key: "quests", label: "퀘스트", iconName: "trail-sign-outline", role: "참여할 수 있는 글쓰기와 활동 과제를 봅니다." },
      { key: "reward", label: "보상 받기", iconName: "gift-outline", role: "달성한 보상을 수령합니다." },
    ],
    nextActions: ["오늘의 글감으로 쓰기", "기록 보기", "진행 중인 업적 확인하기"],
    tips: [
      "성장 탭은 로그인 후 사용할 수 있어요.",
      "보상은 프로필 꾸미기와 연결될 수 있어요.",
    ],
  },
  growthRecords: {
    key: "growthRecords",
    title: "성장 기록",
    route: "/growth/records",
    iconName: "stats-chart-outline",
    summary: "내가 어떤 글을 쓰고 어떤 활동을 했는지 확인하는 화면이에요.",
    visibleContent: ["활동 기록", "오늘의 글감 진행 상황", "이벤트 글 목록", "내가 쓴 글"],
    firstVisit: [
      "오늘의 글감 진행 상황과 최근 활동 흐름을 먼저 확인해요.",
      "이벤트나 프로젝트에 쓴 글이 있으면 목록으로 볼 수 있어요.",
      "글 카드를 누르면 해당 글 상세로 이동합니다.",
    ],
    userFlow: [
      "현재 진행 중인 글감 프로젝트 상태를 확인합니다.",
      "이 주제로 쓰기를 눌러 빠르게 글을 시작합니다.",
      "이전에 쓴 글을 다시 열어 반응과 내용을 확인합니다.",
    ],
    buttons: [
      { key: "write", label: "이 주제로 쓰기", iconName: "create-outline", role: "현재 글감으로 글을 시작합니다." },
      { key: "post", label: "글 카드", iconName: "reader-outline", role: "해당 글 상세를 엽니다." },
    ],
    nextActions: ["오늘의 글감 진행 확인", "이전 글 다시 읽기"],
    tips: [
      "활동 기록은 새로고침으로 최신 상태를 다시 불러올 수 있어요.",
    ],
  },
  growthAchievements: {
    key: "growthAchievements",
    title: "업적",
    route: "/growth/achievements",
    iconName: "trophy-outline",
    summary: "글숲에서 쌓은 활동의 이정표예요. 완료한 업적은 보상을 받을 수 있어요.",
    visibleContent: ["진행 중 업적", "달성 완료 업적", "잠긴 업적", "보상"],
    firstVisit: [
      "업적은 진행 중, 달성 완료, 잠긴 업적으로 나뉩니다.",
      "완료한 업적은 보상 받기 버튼이 표시될 수 있어요.",
      "받은 보상은 프로필 꾸미기로 이어질 수 있어요.",
    ],
    userFlow: [
      "진행 중 업적에서 다음 목표를 확인합니다.",
      "완료한 업적의 보상을 받습니다.",
      "꾸미기 버튼이 있으면 프로필에 적용해 봅니다.",
    ],
    buttons: [
      { key: "claim", label: "받기", iconName: "gift-outline", role: "완료한 업적 보상을 수령합니다." },
      { key: "customize", label: "꾸미기", iconName: "color-wand-outline", role: "보상을 프로필 꾸미기에 적용합니다." },
    ],
    nextActions: ["진행 중 업적 확인", "완료한 보상 받기"],
    tips: [
      "잠긴 업적은 조건을 만족하면 진행 가능 상태로 바뀔 수 있어요.",
    ],
  },
  growthQuests: {
    key: "growthQuests",
    title: "퀘스트",
    route: "/growth/quests",
    iconName: "trail-sign-outline",
    summary: "글쓰기를 시작하기 쉽게 만든 작은 목표예요. 글감형 퀘스트는 바로 글쓰기 화면으로 이어집니다.",
    visibleContent: ["진행 중 퀘스트", "완료 가능 퀘스트", "잠긴 퀘스트", "글감형 퀘스트"],
    firstVisit: [
      "퀘스트는 캠페인이나 이벤트 기준으로 묶여 보여요.",
      "글감형 퀘스트는 버튼을 누르면 글쓰기 화면에 주제가 채워져요.",
      "완료 조건을 만족하면 보상을 받을 수 있어요.",
    ],
    userFlow: [
      "진행 가능한 퀘스트를 확인합니다.",
      "글쓰기 시작을 눌러 퀘스트 주제로 글을 씁니다.",
      "완료 후 보상 받기를 눌러 수령합니다.",
    ],
    buttons: [
      { key: "start", label: "글쓰기 시작", iconName: "create-outline", role: "퀘스트 글감으로 글쓰기 화면을 엽니다." },
      { key: "claim", label: "보상 받기", iconName: "gift-outline", role: "완료한 퀘스트 보상을 수령합니다." },
    ],
    nextActions: ["진행 가능한 퀘스트 보기", "글감형 퀘스트로 글쓰기"],
    tips: [
      "잠긴 퀘스트는 이전 조건이나 기간 조건이 있을 수 있어요.",
    ],
  },
  me: {
    key: "me",
    title: "내 정보",
    route: "/me",
    iconName: "person-circle-outline",
    summary:
      "다른 사람에게 보이는 내 프로필을 확인하고 관리하는 곳이에요. 프로필 꾸미기와 계정 설정도 여기서 시작합니다.",
    visibleContent: ["내 공개 프로필", "내 글", "팔로워/팔로잉", "프로필 꾸미기", "계정 센터"],
    firstVisit: [
      "상단 프로필 영역은 다른 사용자에게 보이는 내 공개 정보예요.",
      "내 글 목록에서는 내가 발행한 글을 다시 열 수 있어요.",
      "설정 버튼은 계정 센터로 이어집니다.",
    ],
    userFlow: [
      "내 프로필 이름과 소개가 어떻게 보이는지 확인합니다.",
      "프로필 꾸미기에서 배경이나 보상을 적용합니다.",
      "팔로워/팔로잉을 확인합니다.",
      "계정 센터에서 보안, 차단, 도움말을 관리합니다.",
    ],
    buttons: [
      { key: "customize", label: "프로필 꾸미기", iconName: "color-wand-outline", role: "배경, 뱃지, 꾸미기 요소를 바꿉니다." },
      { key: "followers", label: "팔로워", iconName: "people-outline", role: "나를 팔로우한 사람을 봅니다." },
      { key: "followings", label: "팔로잉", iconName: "person-add-outline", role: "내가 팔로우한 사람을 봅니다." },
      { key: "settings", label: "설정", iconName: "settings-outline", role: "계정 센터로 이동합니다." },
      { key: "post", label: "내 글", iconName: "reader-outline", role: "내가 쓴 글 상세로 이동합니다." },
    ],
    nextActions: ["내 프로필 확인", "프로필 꾸미기", "계정 센터 열기"],
    tips: [
      "프로필 사진 업로드 같은 일부 기능은 프리미엄 상태에 따라 제한될 수 있어요.",
    ],
  },
  author: {
    key: "author",
    title: "작가 프로필",
    route: "/(tabs)",
    iconName: "people-outline",
    summary:
      "한 작가의 글을 모아 보고 팔로우할 수 있어요. 팔로우하면 홈의 팔로잉 피드에서 다시 만날 수 있습니다.",
    visibleContent: ["작가 공개 정보", "작가 글 목록", "팔로우 상태", "신고/차단/공유"],
    firstVisit: [
      "작가의 공개 정보와 글 목록을 한 화면에서 볼 수 있어요.",
      "팔로우 버튼으로 이 작가의 글을 팔로잉 피드에 모을 수 있어요.",
      "보고 싶지 않은 사용자는 더보기에서 차단할 수 있어요.",
    ],
    userFlow: [
      "작가 소개와 최근 글을 훑어봅니다.",
      "마음에 들면 팔로우합니다.",
      "글 카드를 눌러 작가의 글 상세로 이동합니다.",
      "문제가 있으면 신고 또는 차단합니다.",
    ],
    buttons: [
      { key: "follow", label: "팔로우", iconName: "person-add-outline", role: "작가의 새 글을 팔로잉 피드에서 볼 수 있게 합니다.", requirement: "login" },
      { key: "share", label: "공유", iconName: "share-social-outline", role: "작가 프로필 링크를 공유합니다." },
      { key: "more", label: "더보기", iconName: "ellipsis-horizontal", role: "신고, 차단 등 안전 기능을 엽니다." },
      { key: "post", label: "글 카드", iconName: "reader-outline", role: "해당 작가의 글 상세로 이동합니다." },
    ],
    nextActions: ["작가 팔로우하기", "작가의 글 읽기"],
    tips: [
      "팔로우는 로그인 후 사용할 수 있어요.",
      "내 프로필에서는 팔로우 대신 프로필 꾸미기와 계정 센터가 보입니다.",
    ],
  },
  notifications: {
    key: "notifications",
    title: "알림",
    route: "/notifications",
    iconName: "notifications-outline",
    summary: "내 글과 활동에 생긴 반응을 확인하는 화면이에요.",
    visibleContent: ["내 글 관련 알림", "활동 알림", "읽음/안 읽음 상태", "관련 화면 이동"],
    firstVisit: [
      "최근 알림이 시간순으로 보여요.",
      "알림 항목을 누르면 관련 글이나 활동 화면으로 이동합니다.",
      "읽은 알림과 새 알림 상태를 구분해 확인할 수 있어요.",
    ],
    userFlow: [
      "새 알림을 확인합니다.",
      "궁금한 알림 항목을 눌러 관련 화면으로 이동합니다.",
      "필요하면 목록을 새로고침합니다.",
    ],
    buttons: [
      { key: "item", label: "알림 항목", iconName: "notifications-outline", role: "관련 글, 작가, 활동 화면으로 이동합니다." },
      { key: "refresh", label: "새로고침", iconName: "refresh-outline", role: "알림 목록을 다시 불러옵니다." },
    ],
    nextActions: ["최근 반응 확인", "알림에서 글로 이동"],
    tips: [
      "알림은 로그인 후 사용할 수 있어요.",
    ],
  },
  accountCenter: {
    key: "accountCenter",
    title: "계정 센터",
    route: "/account-center",
    iconName: "settings-outline",
    summary:
      "내 계정과 앱 사용 환경을 관리하는 곳이에요. 프로필, 보안, 차단, 도움말을 여기서 찾을 수 있습니다.",
    visibleContent: ["프로필 및 공개 정보", "보안 및 로그인", "차단한 사용자", "앱 가이드", "도움말", "계정 관리"],
    firstVisit: [
      "계정과 앱 사용 관련 설정이 메뉴 형태로 모여 있어요.",
      "프로필 정보, 보안, 차단 목록, 도움말을 각각 별도 화면에서 관리합니다.",
      "앱 사용법이 헷갈릴 때 앱 가이드를 다시 열 수 있어요.",
    ],
    userFlow: [
      "프로필 및 공개 정보에서 내 표시 정보를 확인합니다.",
      "보안 및 로그인에서 계정 상태를 점검합니다.",
      "앱 가이드에서 화면별 사용법과 버튼 설명을 다시 봅니다.",
      "문제가 있으면 도움말 및 지원으로 이동합니다.",
    ],
    buttons: [
      { key: "profile", label: "프로필 및 공개 정보", iconName: "person-circle-outline", role: "공개 이름, 소개, 프로필 사진 등을 관리합니다." },
      { key: "security", label: "보안 및 로그인", iconName: "lock-closed-outline", role: "비밀번호와 로그인 상태를 관리합니다." },
      { key: "blocked", label: "차단한 사용자", iconName: "ban-outline", role: "차단 목록을 보고 해제합니다." },
      { key: "guide", label: "앱 가이드", iconName: "compass-outline", role: "앱 사용법을 다시 봅니다." },
      { key: "support", label: "도움말 및 지원", iconName: "help-circle-outline", role: "문의와 정책 문서를 엽니다." },
      { key: "premium", label: "프리미엄", iconName: "sparkles-outline", role: "프리미엄 혜택과 구독 상태를 봅니다.", requirement: "androidLimited" },
    ],
    nextActions: ["앱 가이드 다시 보기", "프로필 정보 관리", "차단 목록 확인"],
    tips: [
      "계정 관리처럼 민감한 메뉴는 신중하게 확인한 뒤 진행합니다.",
      "Android 신규 프리미엄 결제는 아직 제공하지 않습니다.",
    ],
  },
  premium: {
    key: "premium",
    title: "프리미엄",
    route: "/premium",
    iconName: "sparkles-outline",
    summary:
      "글 이미지 저장과 프로필, 위젯 관련 추가 기능을 확인하는 화면이에요. 현재 신규 결제 흐름은 iOS 기준으로 제공합니다.",
    visibleContent: ["프리미엄 혜택", "구독 상품", "구매/복원", "구독 관리", "현재 구독 상태"],
    firstVisit: [
      "상단에서 프리미엄으로 열리는 기능을 먼저 확인해요.",
      "구독 상품과 현재 상태를 확인합니다.",
      "구매, 복원, 구독 관리는 현재 iOS 기준 흐름입니다.",
    ],
    userFlow: [
      "혜택 목록을 확인합니다.",
      "iOS에서는 구독하기 또는 구매 복원으로 App Store 흐름을 진행합니다.",
      "이미 프리미엄이면 문장 액자 같은 기능을 앱 안에서 사용합니다.",
    ],
    buttons: [
      { key: "subscribe", label: "구독하기", iconName: "card-outline", role: "iOS에서 App Store 결제를 시작합니다.", requirement: "iosOnly" },
      { key: "restore", label: "구매 복원", iconName: "refresh-outline", role: "iOS에서 기존 App Store 구독을 다시 확인합니다.", requirement: "iosOnly" },
      { key: "manage", label: "구독 관리", iconName: "open-outline", role: "스토어의 구독 관리 화면을 엽니다.", requirement: "iosOnly" },
      { key: "sentence-frame", label: "문장 액자 위젯", iconName: "albums-outline", role: "직접 고른 글 사진을 홈 화면 위젯에 담는 프리미엄 기능입니다.", requirement: "premium" },
    ],
    nextActions: ["프리미엄 혜택 확인", "문장 액자 기능 읽기"],
    tips: [
      "Android 신규 프리미엄 결제는 아직 구현하지 않습니다.",
      "문장 액자는 직접 고른 글 사진을 홈 화면 위젯에 담는 기능입니다.",
    ],
  },
};

export const GUIDED_HELP_PAGE_ORDER: GuidedHelpPageKey[] = [
  "home",
  "search",
  "postDetail",
  "write",
  "writeDrafts",
  "bookmarks",
  "growth",
  "growthRecords",
  "growthAchievements",
  "growthQuests",
  "me",
  "author",
  "notifications",
  "accountCenter",
  "premium",
];

export const GUIDED_HELP_REPLAYABLE_PAGE_KEYS = new Set<GuidedHelpPageKey>([
  "home",
  "search",
  "write",
  "writeDrafts",
  "bookmarks",
  "growth",
  "growthRecords",
  "growthAchievements",
  "growthQuests",
  "me",
  "notifications",
  "accountCenter",
  "premium",
]);

export const GUIDED_HELP_BUTTON_DICTIONARY: GuidedHelpButton[] = [
  { key: "tab-home", label: "홈", iconName: "home-outline", role: "글을 발견하고 읽는 기본 화면입니다." },
  { key: "tab-bookmarks", label: "저장", iconName: "bookmark-outline", role: "북마크 폴더와 저장한 글을 봅니다.", requirement: "login" },
  { key: "tab-growth", label: "성장", iconName: "sparkles-outline", role: "기록, 퀘스트, 업적을 봅니다.", requirement: "login" },
  { key: "tab-me", label: "내 정보", iconName: "person-circle-outline", role: "내 프로필과 계정을 관리합니다.", requirement: "login" },
  { key: "write", label: "글쓰기", iconName: "create-outline", role: "새 글 작성을 시작합니다.", requirement: "login" },
  { key: "heart", label: "하트", iconName: "heart-outline", role: "글이 마음에 든다는 표시입니다." },
  { key: "bookmark", label: "저장 아이콘", iconName: "bookmark-outline", role: "글을 북마크 폴더에 담습니다.", requirement: "login" },
  { key: "share", label: "공유", iconName: "share-social-outline", role: "링크 또는 이미지를 공유합니다." },
  { key: "download", label: "다운로드", iconName: "download-outline", role: "글 이미지를 기기에 저장합니다." },
  { key: "more", label: "더보기", iconName: "ellipsis-horizontal", role: "안전 기능과 추가 액션을 엽니다." },
  { key: "follow", label: "팔로우", iconName: "person-add-outline", role: "작가를 팔로잉 피드에 추가합니다.", requirement: "login" },
  { key: "report", label: "신고", iconName: "flag-outline", role: "부적절한 글이나 사용자를 신고합니다." },
  { key: "block", label: "차단", iconName: "ban-outline", role: "해당 사용자의 글과 프로필 노출을 제한합니다." },
  { key: "draft", label: "임시저장", iconName: "save-outline", role: "작성 중인 글을 나중에 이어 씁니다." },
  { key: "preview", label: "미리보기", iconName: "eye-outline", role: "발행 전 글 카드 모양을 확인합니다." },
  { key: "publish", label: "발행", iconName: "send-outline", role: "글을 공개합니다." },
  { key: "reward", label: "보상 받기", iconName: "gift-outline", role: "완료한 업적이나 퀘스트 보상을 수령합니다." },
];

export function getGuidedHelpPage(pageKey: GuidedHelpPageKey | null | undefined) {
  return pageKey ? GUIDED_HELP_PAGES[pageKey] : null;
}

export function resolveGuidedHelpPageKey(pathname: string, segments: string[]): GuidedHelpPageKey | null {
  const first = segments[0] ?? "";
  const second = segments[1] ?? "";
  const normalizedPath = pathname.split("?")[0] || "/";

  if (normalizedPath === "/" || (first === "(tabs)" && (!second || second === "index"))) return "home";
  if (first === "(tabs)" && second === "bookmarks") return "bookmarks";
  if (first === "(tabs)" && second === "growth") return "growth";
  if (first === "(tabs)" && second === "me") return "me";

  if (first === "bookmarks") return "bookmarks";
  if (first === "me") return "me";
  if (first === "growth" && second === "records") return "growthRecords";
  if (first === "growth" && second === "achievements") return "growthAchievements";
  if (first === "growth" && second === "quests") return "growthQuests";
  if (first === "growth") return "growth";

  if (first === "search") return "search";
  if (first === "write") return "write";
  if (first === "write-drafts") return "writeDrafts";
  if (first === "posts") return "postDetail";
  if (first === "users") return "author";
  if (first === "notifications") return "notifications";
  if (first === "premium") return "premium";
  if (first === "account-center") return "accountCenter";
  return null;
}
