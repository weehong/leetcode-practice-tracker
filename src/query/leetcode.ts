export const questionLeetCodeQuery = `
    query problemsetQuestionList(
        $categorySlug: String
        $limit: Int
        $skip: Int
        $filters: QuestionListFilterInput
    ) {
        problemsetQuestionList: questionList(
            categorySlug: $categorySlug
            limit: $limit
            skip: $skip
            filters: $filters
        ) {
            total: totalNum
            questions: data {
                acRate
                difficulty
                freqBar
                frontendQuestionId: questionFrontendId
                isFavor
                paidOnly: isPaidOnly
                title
                titleSlug
                topicTags {
                    name
                    id
                    slug
                }
                status
            }
        }
    }`;

export const questionDetailQuery = `
    query getQuestionDetail($titleSlug: String!) {
        question(titleSlug: $titleSlug) {
            questionId
            questionFrontendId
            title
            titleSlug
            content
            difficulty
            isPaidOnly
            topicTags {
                name
                id
                slug
            }
            codeSnippets {
                lang
                langSlug
                code
            }
            sampleTestCase
            metaData
        }
    }`;
