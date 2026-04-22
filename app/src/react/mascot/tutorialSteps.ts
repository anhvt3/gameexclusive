/**
 * Tutorial step data — ISP v1.1 Step 18.
 * Kept in a separate module so TutorialSequence.tsx exports only the
 * component (react-refresh boundary).
 */

export const TUTORIAL_FLAG = 'tutorial_completed';

export interface TutorialStep {
  portraitFile: string;
  text: string;
}

export const TUTORIAL_STEPS: readonly TutorialStep[] = [
  {
    portraitFile: 'soc_guide_greet.png',
    text: 'Chào bạn! Mình là Sóc — bạn đồng hành của bạn trong thế giới Elemagica.',
  },
  {
    portraitFile: 'soc_guide_talk.png',
    text: 'Thế giới này có quái vật mang 8 nguyên tố. Chạm vào quái là bạn bước vào trận đấu.',
  },
  {
    portraitFile: 'soc_guide_think.png',
    text: 'Mỗi trận: chọn phép, trả lời câu đố. Trả lời đúng → gây sát thương. Sai → quái phản công.',
  },
  {
    portraitFile: 'soc_guide_cheer.png',
    text: 'Sẵn sàng chưa? Cùng bắt đầu phiêu lưu nào!',
  },
] as const;
