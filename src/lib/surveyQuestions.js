/**
 * All 10 post-draw survey questions.
 * Two are picked at random per modal invocation.
 *
 * answer types:
 *   rating5      — 1-5 scale buttons
 *   yesno        — Yes / No
 *   yesno_maybe  — Yes / It's okay / No
 *   outcome      — Better / About right / Less than expected
 *   alternatives — multiple-choice (how did you fundraise before)
 *   nps          — 0-10 numeric row
 *   text         — free-text textarea
 */

export const SURVEY_QUESTIONS = [
  {
    key:  'overall_satisfaction',
    text: 'How satisfied were you with Lucky Squares overall?',
    type: 'rating5',
    labels: ['Poor', 'Fair', 'Good', 'Great', 'Excellent'],
  },
  {
    key:  'ease_of_setup',
    text: 'How easy was it to set up and run your fundraiser?',
    type: 'rating5',
    labels: ['Very hard', 'Hard', 'Okay', 'Easy', 'Very easy'],
  },
  {
    key:  'website_usability',
    text: 'Was the Lucky Squares website easy to navigate and understand?',
    type: 'yesno',
  },
  {
    key:    'pricing',
    text:   'Do you think $19 per campaign is good value?',
    type:   'yesno_maybe',
    labels: ['Great value', 'About right', 'Too expensive'],
  },
  {
    key:  'payment_experience',
    text: 'How smooth was the payment and checkout experience for your participants?',
    type: 'rating5',
    labels: ['Very rough', 'Rough', 'Okay', 'Smooth', 'Very smooth'],
  },
  {
    key:  'draw_feature',
    text: 'Did the live draw feature work well and feel exciting for your participants?',
    type: 'rating5',
    labels: ['Not at all', 'Not really', 'Sort of', 'Yes', 'Absolutely'],
  },
  {
    key:    'fundraising_outcome',
    text:   'Did Lucky Squares help you raise what you were hoping for?',
    type:   'outcome',
    labels: ['More than hoped', 'About what I hoped', 'Less than hoped'],
  },
  {
    key:    'alternatives',
    text:   'Before Lucky Squares, how did you run fundraisers like this?',
    type:   'alternatives',
    labels: ['Physical raffle tickets', 'Facebook or social media', 'Another app or website', 'This was our first time', 'Other'],
  },
  {
    key:  'nps',
    text: 'How likely are you to recommend Lucky Squares to another club, school, or community group?',
    type: 'nps',
  },
  {
    key:  'open_feedback',
    text: 'Is there anything we could do to make Lucky Squares better?',
    type: 'text',
  },
];

/** Pick n distinct questions at random */
export function pickRandom(n = 2) {
  const shuffled = [...SURVEY_QUESTIONS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

/** Return the question object for a given key */
export function getQuestion(key) {
  return SURVEY_QUESTIONS.find((q) => q.key === key) ?? null;
}
