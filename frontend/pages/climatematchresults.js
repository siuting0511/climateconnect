import React, {useContext, useEffect, useState} from "react";
import getTexts from "../public/texts/texts_optimized";
import ClimateMatchResultsRoot from "../src/components/climateMatchResults/ClimateMatchResultsRoot";
import UserContext from "../src/components/context/UserContext";
import WideLayout from "../src/components/layouts/WideLayout";

export default function ClimateMatchResults() {
  const { locale } = useContext(UserContext);
  const [texts, setTexts] = useState({});

  useEffect(async () => {
    if (locale) {
      setTexts(await getTexts({ page: "climatematch", locale: locale}));
    }
  },[locale]);
  return (
    <WideLayout useFloodStdFont title={texts.your_climate_match_results}>
      <ClimateMatchResultsRoot />
    </WideLayout>
  );
}
