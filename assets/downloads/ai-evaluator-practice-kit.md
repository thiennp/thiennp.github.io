# AI Evaluator Practice Kit

Use this to train for AI evaluation assessments. Do not use it to outsource live assessment answers. Platforms expect your own judgment.

## Core habits

1. Read the task rubric before reading the model answer.
2. Separate factual accuracy from writing quality.
3. Mark unsupported claims even if they sound confident.
4. Prefer specific evidence over general impressions.
5. Explain ratings in short, concrete sentences.
6. Do not over-penalize harmless style differences.
7. Do not reward fluent answers that miss the user request.

## Evaluation checklist

| Dimension | Question |
| --- | --- |
| Instruction following | Did the answer do what the user asked? |
| Factuality | Are the claims true and supported? |
| Completeness | Is anything important missing? |
| Safety | Does it avoid harmful or inappropriate help? |
| Clarity | Is it understandable and well organized? |
| Usefulness | Would the user know what to do next? |

## Practice prompt

User request:
"Give me three ways to improve my resume for a frontend engineering role."

Weak answer:
"Just make it more professional and add your skills. Use a nice template and include projects."

Evaluation:
- Instruction following: Partial. It gives ideas, but not three concrete improvements.
- Usefulness: Low. The suggestions are generic.
- Better response should mention measurable impact, relevant frontend keywords, and project evidence.

## Rating explanation template

"I rated this [score] because it [specific strength] but [specific weakness]. The most important issue is [issue], which matters because [reason]."

## Factuality check pattern

1. Identify each factual claim.
2. Mark claims that need verification.
3. Check whether the answer overstates certainty.
4. Penalize fabricated details more than missing details.
5. Reward clear uncertainty when the facts are not known.

## Short-form practice

Rate this answer from 1 to 5:

User:
"What is the fastest way to learn React?"

Answer:
"React can be mastered in one weekend if you watch enough tutorials. You should skip JavaScript and start with Redux."

Notes:
- Look for unrealistic claims.
- Check whether the advice helps a beginner.
- Explain the score in one or two sentences.
