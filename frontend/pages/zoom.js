import React, {useContext, useEffect, useState} from "react";
import getTexts from "../public/texts/texts_optimized";
import UserContext from "../src/components/context/UserContext";

export default function Zoom() {
  const { locale } = useContext(UserContext);
  const [texts, setTexts] = useState({});

  useEffect(async () => {
    if (locale) {
      setTexts(await getTexts({page: "general", locale: locale}));
    }
  },[locale]);

    useEffect(() => {
    window.location = "https://zoom.us/j/96281669535";
  });
  return <div>{texts.you_are_being_redirected_to_the_climate_connect_zoom}...</div>;
}
