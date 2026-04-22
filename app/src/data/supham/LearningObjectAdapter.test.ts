import { describe, it, expect } from 'vitest';
import { LearningObjectSchema } from './LearningObjectSchema';
import { loadMockLOs } from './LearningObjectAdapter';

describe('LearningObjectSchema — Zod validation', () => {
  it('MultipleChoice valid LO parses', () => {
    const valid = {
      id: 1,
      learning_object_code: 'TEST_MC',
      learning_object_name: 'Test',
      grade_name: 'G5',
      subject_name: 'Math',
      learning_object_difficulty: { learning_object_difficulty_name: '2' },
      quiz_type_id: 3,
      question_text: 'Q?',
      options: [
        { id: 'a', text: 'A' },
        { id: 'b', text: 'B' },
      ],
      correct_option_id: 'a',
      time_limit_sec: 60,
      min_time_sec: 3,
    };
    expect(() => LearningObjectSchema.parse(valid)).not.toThrow();
  });

  it('MC missing correct_option_id throws ZodError', () => {
    const invalid = {
      id: 1,
      learning_object_code: 'TEST',
      learning_object_name: 'T',
      grade_name: 'G5',
      subject_name: 'Math',
      learning_object_difficulty: { learning_object_difficulty_name: '2' },
      quiz_type_id: 3,
      question_text: 'Q',
      options: [{ id: 'a', text: 'A' }],
      // correct_option_id missing
    };
    expect(() => LearningObjectSchema.parse(invalid)).toThrow();
  });

  it('Cloze valid LO parses', () => {
    const valid = {
      id: 2,
      learning_object_code: 'TEST_CLOZE',
      learning_object_name: 'T',
      grade_name: 'G4',
      subject_name: 'KEN',
      learning_object_difficulty: { learning_object_difficulty_name: '1' },
      quiz_type_id: 1,
      question_text: 'Fill ___(1)___',
      blanks: [{ id: 1, correct_answer: 'ans', alternatives: ['ans'] }],
      case_sensitive: false,
    };
    expect(() => LearningObjectSchema.parse(valid)).not.toThrow();
  });

  it('DragDrop valid LO parses', () => {
    const valid = {
      id: 3,
      learning_object_code: 'TEST_DD',
      learning_object_name: 'T',
      grade_name: 'G6',
      subject_name: 'KEN',
      learning_object_difficulty: { learning_object_difficulty_name: '2' },
      quiz_type_id: 8,
      question_text: 'Drag',
      drop_zones: [{ id: 'z1', label: 'Z1', capacity: 2, correct_items: ['a'] }],
      draggable_items: [{ id: 'a', text: 'A' }],
    };
    expect(() => LearningObjectSchema.parse(valid)).not.toThrow();
  });

  it('invalid grade_name rejected', () => {
    const invalid = {
      id: 4,
      learning_object_code: 'X',
      learning_object_name: 'X',
      grade_name: 'G99', // invalid
      subject_name: 'Math',
      learning_object_difficulty: { learning_object_difficulty_name: '1' },
      quiz_type_id: 3,
      question_text: 'Q',
      options: [{ id: 'a', text: 'A' }],
      correct_option_id: 'a',
    };
    expect(() => LearningObjectSchema.parse(invalid)).toThrow();
  });

  it('unknown quiz_type_id rejected (only 1/3/8 supported)', () => {
    const invalid = {
      id: 5,
      learning_object_code: 'X',
      learning_object_name: 'X',
      grade_name: 'G5',
      subject_name: 'Math',
      learning_object_difficulty: { learning_object_difficulty_name: '1' },
      quiz_type_id: 999,
    };
    expect(() => LearningObjectSchema.parse(invalid)).toThrow();
  });
});

describe('LearningObjectAdapter — loadMockLOs', () => {
  it('loadMockLOs(3, "G5") returns MC LOs for G5 only', () => {
    const result = loadMockLOs(3, 'G5');
    expect(result.length).toBeGreaterThan(0);
    for (const lo of result) {
      expect(lo.quiz_type_id).toBe(3);
      expect(lo.grade_name).toBe('G5');
    }
  });

  it('loadMockLOs(1, "G4") returns Cloze LOs for G4 only', () => {
    const result = loadMockLOs(1, 'G4');
    expect(result.length).toBeGreaterThan(0);
    for (const lo of result) {
      expect(lo.quiz_type_id).toBe(1);
      expect(lo.grade_name).toBe('G4');
    }
  });

  it('loadMockLOs(8, "G6") returns DragDrop for G6', () => {
    const result = loadMockLOs(8, 'G6');
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]?.quiz_type_id).toBe(8);
  });

  it('loadMockLOs unknown grade returns empty array', () => {
    expect(loadMockLOs(3, 'G2')).toEqual([]);
  });

  it('all mock JSON pass validation at load time (total >= 6 LOs)', () => {
    const allMc = loadMockLOs(3, 'G5').concat(loadMockLOs(3, 'G8'));
    const allCloze = loadMockLOs(1, 'G4').concat(loadMockLOs(1, 'G7'));
    const allDd = loadMockLOs(8, 'G6').concat(loadMockLOs(8, 'G3'));
    expect(allMc.length + allCloze.length + allDd.length).toBeGreaterThanOrEqual(6);
  });
});
