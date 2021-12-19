import general_texts from "./general_texts.json";

export default async function getTexts(props
                                       /*{
                                     classes,
                                     filterType,
                                     goal,
                                     hubName,
                                     idea,
                                     isNarrowScreen,
                                     locale,
                                     location,
                                     organization,
                                     page,
                                     profile,
                                     project,
                                     url_slug,
                                     user,
                                     question,
                                     creator,
                                   }*/
) {
  let texts = import(`./${props.page}_texts`).catch(() => {
  });
  return texts.then(module => {
    const moduleTexts = {
      ...general_texts,
      ...module
    };

    return Object.keys(moduleTexts).reduce((obj, curKey) => {
      if (moduleTexts[curKey][props.locale]) obj[curKey] = moduleTexts[curKey][props.locale];
      else obj[curKey] = moduleTexts[curKey]["en"];
      return obj;
    }, {});
  }).catch(() => {});
}
