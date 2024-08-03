import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: 'key', //add more keys in a loop could solve the request limit in a minute
  dangerouslyAllowBrowser: true,
});
function generateSummary(insights: string) {
  console.log(insights);
  return openai.chat.completions
    .create({
      messages: [{ role: 'user', content: insights }],
      model: 'gpt-3.5-turbo', // change model if necessary
    })
    .then(chatCompletion => {
      console.log(chatCompletion.choices[0].message.content);
      return chatCompletion.choices[0].message.content;
    })
    .catch(error => {
      console.error('Error during API call:', error);
      console.error('Error details:', error.response ? error.response.data : 'No response data');
      return null;
    });
}
export default generateSummary;
