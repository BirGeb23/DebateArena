export type TopicCategory = {
  category: 'Ethics' | 'Society' | 'Technology' | 'Wildcard'
  topics: string[]
}

export const topicCategories: TopicCategory[] = [
  {
    category: 'Ethics',
    topics: [
      'AI should replace human judges',
      'Universal basic income should be mandatory',
      'Social media does more harm than good',
      'Animals should have legal rights',
      'Genetic enhancement of humans should be allowed',
    ],
  },
  {
    category: 'Society',
    topics: [
      'College degrees are no longer worth it',
      'Remote work should be the default',
      'Smartphones have made us less intelligent',
      'Cancel culture is good for society',
      'Voting should be mandatory',
    ],
  },
  {
    category: 'Technology',
    topics: [
      'Privacy is dead and we should accept it',
      'Self-driving cars should replace human drivers',
      'Crypto will replace traditional currency',
      'Video games cause real-world violence',
      'The metaverse will replace physical social interaction',
    ],
  },
  {
    category: 'Wildcard',
    topics: [
      'Pineapple belongs on pizza',
      'Mornings are better than evenings',
      'Cats are smarter than dogs',
      'Books are better than movies',
      'It is better to be feared than loved',
    ],
  },
]

export const debateTopics = topicCategories.flatMap((section) => section.topics)
