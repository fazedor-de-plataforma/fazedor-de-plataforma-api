/* eslint-disable eqeqeq */
/* eslint-disable no-return-await */
/* eslint-disable consistent-return */
/* eslint-disable no-plusplus */
/* eslint-disable no-undef */
/* eslint-disable no-shadow */

const puppeteer = require("puppeteer");
const express = require("express");
const { Router } = require("express");

const cors = require("cors");
/*
usuário
senha
nome da materia
nome da plataforma
questoes
codigo - alternativa
codigo - alternativa
codigo - alternativa
codigo - alternativa

"/jogos"
"/animes"
"/comida"
*/

const server = express();
const routes = Router();

server.use(cors());
server.use(express.json());
server.use(routes);

async function login(page, login, password) {
  await page.type('input[name="usuario"]', login);
  await page.type('input[name="senha"]', password);
  await page.click("#btnEntrar");
}

async function selectSubject(page, subjectName) {
  const subjectLink = await page.evaluate((subjectName) => [...document.querySelector("#tns3").children]
    .map((subject) => ({ link: subject.href, nome: subject.title }))
    .filter((subject) => subject.nome === subjectName)[0].link, subjectName);

  await page.goto(subjectLink);
}

async function selectPlatform(page, platformName) {
  await page.evaluate((platformName) => {
    const platforms = [...document.getElementsByClassName("group-book-video-item")];
    for (let i = 0; i < platforms.length; i++) {
      const possiblePlatform = platforms[i].children[0].children[0].children[0].innerHTML;
      if (platformName === possiblePlatform.split(". ")[1]) platforms[i].children[0].click();
    }
  }, platformName);

  await page.waitForSelector("body > div.wrapper.full > div > div.box.box-full.group-book-video.box-num6 > div.group-book-video-item.opened > ul");

  const platformLink = await page.evaluate(() => document.getElementsByClassName("opened")[0].children[2].children[0].children[0].children[3].children[0].children[0].href);

  await page.goto(platformLink);
}

async function checkAnswer(page, questions) {
  const dict = {
    A: 0,
    B: 1,
    C: 2,
    D: 3,
    E: 4,
  };

  await page.waitForSelector("body > div.wrapper.full > div.content.questao-page > div.questao-container > div > div.title > div.id-quest");
  const currentQuestionCode = await page.evaluate(() => document.querySelector("body > div.wrapper.full > div.content.questao-page > div.questao-container > div > div.title > div.id-quest")
    .innerHTML.split("Q")[1].replace(/\s+/g, "").slice(-2));

  const currentQuestion = questions.filter((question) => question.code === currentQuestionCode)[0];
  if (currentQuestion) {
    await page.evaluate((dict, question) => document.querySelector("#alternativas").children[dict[question.answer]].children[1].click(), dict, currentQuestion);
    await page.click("#Responder");
    await page.waitForSelector("body > div.swal2-container.swal2-center.swal2-backdrop-show > div > div.swal2-actions > button.swal2-confirm.swal2-styled");
    await page.click("body > div.swal2-container.swal2-center.swal2-backdrop-show > div > div.swal2-actions > button.swal2-confirm.swal2-styled");
    return await checkAnswer(page, questions
      .filter((question) => question.code != currentQuestionCode));
  }

  console.log("acabou!");
}

routes.post("/", async (req, res) => {
  const {
    user, password, subject, platform, questions,
  } = req.body;
  
  const browser = await puppeteer.launch({args: ['--no-sandbox', '--disable-setuid-sandbox']});
  console.log("chamou");
  try {
    const page = await browser.newPage();
    await page.goto("https://ava.sae.digital/");
    await login(page, user, password);
    console.log("logou");
    await page.waitForSelector("#tns3");
    await selectSubject(page, subject);
    console.log("selecionou materia");
    await selectPlatform(page, platform);
    console.log("selecionou plataforma");
    await checkAnswer(page, questions);
    return res.sendStatus(200);
  } catch (error) {
    console.log(error);
    console.log("deumerda")
    return res.sendStatus(503);
  }
});

server.listen(3000);
