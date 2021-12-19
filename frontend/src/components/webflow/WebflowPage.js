import parseHtml from "html-react-parser";
import Head from "next/head";
import React, {useContext, useEffect, useState} from "react";
import getTexts from "../../../public/texts/texts_optimized";
import UserContext from "../context/UserContext";
import WideLayout from "../layouts/WideLayout";

export default function WebflowPage({ bodyContent, headContent, pageKey, className }) {
  const { locale } = useContext(UserContext);
    const [texts, setTexts] = useState({});

    useEffect(async () => {
        if (locale) {
            setTexts(await getTexts({page: "navigation", locale: locale}));
        }
    },[locale]);

  return (
    <>
      <Head>{parseHtml(headContent)}</Head>
      <WideLayout
        rootClassName={className}
        title={texts[pageKey]}
        isStaticPage
        hideHeadline
        noSpaceBottom
      >
        <div dangerouslySetInnerHTML={{ __html: bodyContent }} />
      </WideLayout>
    </>
  );
}
