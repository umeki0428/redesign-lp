/**
 * 初回に 1 回だけ実行する。
 * Google フォームと回答のスプレッドシートを作り、送信時のトリガーを登録し、
 * サイトに入れる送信先 URL と entry ID をログに出す。
 */
function setupContactForm() {
  const props = PropertiesService.getScriptProperties();
  const existing = props.getProperty('FORM_ID');
  if (existing) {
    throw new Error('フォームは作成済みです（FORM_ID: ' + existing + '）。作り直す場合は、スクリプトプロパティの FORM_ID を消してから実行してください。');
  }

  const form = FormApp.create(FORM_TITLE)
    .setDescription('RE DESIGN のサイト（お問い合わせ）からの送信を受け付けるフォームです。回答はサイトから送られます。')
    .setCollectEmail(false)
    .setAllowResponseEdits(false)
    .setShowLinkToRespondAgain(false)
    .setConfirmationMessage('送信ありがとうございました。');
  requireNoLogin_(form);
  FIELDS.forEach(function (field) { addItem_(form, field); });

  const sheet = SpreadsheetApp.create(FORM_TITLE + '（回答）');
  form.setDestination(FormApp.DestinationType.SPREADSHEET, sheet.getId());
  props.setProperty('FORM_ID', form.getId());
  installSubmitTrigger_(form);

  console.log('フォームの編集：' + form.getEditUrl());
  console.log('回答のシート：' + sheet.getUrl());
  logEmbedInfo();
}

/** サイトに入れる送信先 URL と entry ID をログに出す。あとから何度でも実行できる */
function logEmbedInfo() {
  const form = getContactForm_();
  const entries = form.getItems().reduce(function (acc, item) {
    const field = FIELDS.filter(function (f) { return f.title === item.getTitle(); })[0];
    return field ? Object.assign({}, acc, { [field.key]: entryIdOf_(form, item, field) }) : acc;
  }, {});
  const embed = { action: form.getPublishedUrl().replace(/\/viewform.*$/, '/formResponse'), entries: entries };
  console.log('サイトに入れる値（このまま貼って返してください）：\n' + JSON.stringify(embed, null, 2));
  return embed;
}

/**
 * 作成済みのフォームに、FIELDS にあってフォームにない項目を足す（FIELDS と同じ順番の位置に置く）。
 * 項目を増やしたときに実行する。既存の項目と回答はそのまま残る
 */
function syncFormItems() {
  const form = getContactForm_();
  const added = FIELDS.reduce(function (acc, field, index) {
    const exists = form.getItems().some(function (item) { return item.getTitle() === field.title; });
    if (exists) return acc;
    const item = addItem_(form, field);
    form.moveItem(item.getIndex(), Math.min(index, form.getItems().length - 1));
    return acc.concat(field.title);
  }, []);
  console.log(added.length ? '足した項目：' + added.join('、') : '足す項目はありませんでした');
  logEmbedInfo();
}

/** 送信時のトリガーを登録し直す（同じ関数のトリガーは先に消す） */
function installSubmitTrigger_(form) {
  ScriptApp.getProjectTriggers()
    .filter(function (t) { return t.getHandlerFunction() === 'onContactSubmit'; })
    .forEach(function (t) { ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('onContactSubmit').forForm(form).onFormSubmit().create();
}

function addItem_(form, field) {
  const builders = {
    text: function () { return form.addTextItem(); },
    paragraph: function () { return form.addParagraphTextItem(); },
    radio: function () { return form.addMultipleChoiceItem().setChoiceValues(field.choices); },
    select: function () { return form.addListItem().setChoiceValues(field.choices); },
    checkbox: function () { return form.addCheckboxItem().setChoiceValues(field.choices); },
  };
  if (!builders[field.type]) throw new Error('未対応の項目の種類です：' + field.type + '（' + field.key + '）');
  return builders[field.type]().setTitle(field.title).setRequired(false);
}

/** ログインなしで回答できるようにする。Google Workspace 以外のアカウントでは設定がないので飛ばす */
function requireNoLogin_(form) {
  try {
    form.setRequireLogin(false);
  } catch (err) {
    console.log('setRequireLogin は使えないアカウントのため飛ばしました：' + err.message);
  }
}

/** 事前入力 URL から entry ID を読み取る。項目ごとに 1 つずつ入れて URL を作る */
function entryIdOf_(form, item, field) {
  const sample = field.choices ? field.choices[0] : 'x';
  const typed = {
    text: function () { return item.asTextItem().createResponse(sample); },
    paragraph: function () { return item.asParagraphTextItem().createResponse(sample); },
    radio: function () { return item.asMultipleChoiceItem().createResponse(sample); },
    select: function () { return item.asListItem().createResponse(sample); },
    checkbox: function () { return item.asCheckboxItem().createResponse([sample]); },
  };
  const url = form.createResponse().withItemResponse(typed[field.type]()).toPrefilledUrl();
  const match = url.match(/entry\.(\d+)=/);
  if (!match) throw new Error('entry ID を読み取れませんでした：' + field.title);
  return 'entry.' + match[1];
}

function getContactForm_() {
  const id = PropertiesService.getScriptProperties().getProperty('FORM_ID');
  if (!id) throw new Error('FORM_ID がありません。先に setupContactForm を実行してください。');
  return FormApp.openById(id);
}
