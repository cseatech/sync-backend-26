async function sendMail(
  to: string,
  subject: string,
  body: string
): Promise<void> {
  // TODO: implement email sending
  console.log(to,subject,body);
}

export {
  sendMail
};