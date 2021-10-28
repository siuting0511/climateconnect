import { Chip, makeStyles, Typography } from "@material-ui/core";
import CloseIcon from "@material-ui/icons/Close";
import React, { useContext } from "react";
import { DragDropContext, Draggable, Droppable } from "react-beautiful-dnd";
import climateMatchStyles from "../../../public/styles/climateMatchStyles";
import getTexts from "../../../public/texts/texts";
import FeedbackContext from "../context/FeedbackContext";
import UserContext from "../context/UserContext";
import ClimateMatchHeadline from "./ClimateMatchHeadline";
import QuestionButtonBar from "./QuestionButtonBar";

const useStyles = makeStyles((theme) => ({
  ...climateMatchStyles(theme),
  root: {
    display: "flex",
    marginTop: theme.spacing(4),
    marginBottom: theme.spacing(4),
    marginLeft: theme.spacing(2),
    marginRight: theme.spacing(2),
    maxHeight: 500 - theme.spacing(8)
  },
  headline: {
    marginBottom: theme.spacing(4),
    textAlign: "center",
  },
  container: {
    flex: "1 1 0px",
  },
  questionAndSelectedAnswersContainer: {
    marginRight: theme.spacing(4),
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
  },
  selectedAnswerContainer: {
    display: "flex",
    alignItems: "center",
    marginBottom: theme.spacing(2),
  },
  choiceRankText: {
    marginRight: theme.spacing(2),
    fontSize: 25,
    width: 25,
  },
  selectedAnswerChip: {
    flexGrow: 1,
    height: 40,
    borderRadius: 20,
    transform: "none !important",
  },
  possibleAnswerContainer: {
    display: "flex",
    alignItems: "center",
    marginBottom: theme.spacing(1),
  },
  listEqualsChar: {
    color: "yellow",
    fontSize: 30,
    marginRight: theme.spacing(1.5),
  },
  alreadySelectedPossibleAnswer: {
    background: "#e0e0e0",
    color: theme.palette.secondary.main,
  },
  closeIcon: {
    cursor: "pointer",
  },
  selectedAnswers: {
    height: 170,
  },
  answerOptions: {
    height: "100%",
    paddingRight: theme.spacing(1),
    overflowY: "scroll",
    ["&::-webkit-scrollbar"]: {
      display: "block",
      height: 10,
    },
    "&::-webkit-scrollbar-track": {
      backgroundColor: "rgba(255,255,255,0.1)",
      borderRadius: 20,
    },
    "&::-webkit-scrollbar-thumb": {
      backgroundColor: theme.palette.secondary.main,
      borderRadius: 20,
    },
  }
}));

export default function RankingQuestionTypeBody({
  step,
  question,
  numberOfChoices,
  answers,
  onChangeAnswer,
  handleForwardClick,
  onBackClick,
  userAnswer,
}) {
  const classes = useStyles();
  const { locale } = useContext(UserContext);
  const { showFeedbackMessage } = useContext(FeedbackContext);
  const texts = getTexts({ page: "climatematch", locale: locale });
  // This will be used to set weight for each answer
  const weights = { 0: 100, 1: 80, 2: 50 };
  const onDragEnd = (result) => {
    if (!result.destination) return;
    //The user selected an answer!
    if (
      result.destination.droppableId === "selectedAnswers" &&
      userAnswer?.length <= numberOfChoices
    ) {
      if (result.source.droppableId !== result.destination.droppableId) {
        //element has been added to the user's choices
        const selectedAnswer = answers[result.source.index];
        const newAnswerObject = [
          ...userAnswer.slice(0, result.destination.index),
          {
            id: selectedAnswer.id,
            text: selectedAnswer.text,
            weight: weights[result.destination.index],
          },
          ...userAnswer.slice(result.destination.index, numberOfChoices),
        ];
        onChangeAnswer(step, newAnswerObject);
      } else {
        //elements have been moved within the user's choices
        const newAnswerObject = [...userAnswer];
        //switch the item that have been moved and the item in the position it has been moved to
        const itemBeingMoved = newAnswerObject[result.source.index];
        newAnswerObject[result.source.index] = newAnswerObject[result.destination.index];
        newAnswerObject[result.destination.index] = itemBeingMoved;
        onChangeAnswer(step, newAnswerObject);
      }
    }
  };

  const onRemoveAnswer = (event, index) => {
    event.preventDefault();
    onChangeAnswer(
      step,
      userAnswer.filter((choice, curChoiceIndex) => curChoiceIndex !== index)
    );
  };

  const onForwardClick = () => {
    if (userAnswer.length === 0) {
      showFeedbackMessage({
        message: texts.please_choose_at_least_one_answer_to_progress,
        error: true,
      });
    } else {
      handleForwardClick();
    }
  };

  const handleClickChip = (index) => {
    const selectedAnswer = answers[index];
    if (userAnswer.length < numberOfChoices) {
      onChangeAnswer(step, [
        ...userAnswer,
        {
          id: selectedAnswer.id,
          text: selectedAnswer.text,
          weight: weights[userAnswer.length],
        },
      ]);
    }
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className={classes.root}>
        <div className={`${classes.container} ${classes.questionAndSelectedAnswersContainer}`}>
          <ClimateMatchHeadline size="medium" className={classes.headline}>
            {question.text}
          </ClimateMatchHeadline>
          <Droppable droppableId="selectedAnswers">
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className={classes.selectedAnswers}
              >
                {[...Array(numberOfChoices)].map((e, i) => (
                  <div key={i} className={classes.selectedAnswerContainer}>
                    <span className={classes.choiceRankText}>{i + 1}.</span>
                    {userAnswer?.length >= i + 1 ? (
                      <Draggable key={i} draggableId={"draggable_choice" + i} index={i}>
                        {(provided) => (
                          <>
                            <Chip
                              label={userAnswer[i].text}
                              className={classes.possibleAnswerChip}
                              ref={provided.innerRef}
                              onClick={(event) => onRemoveAnswer(event, i)}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                            />
                            <CloseIcon
                              className={classes.closeIcon}
                              onClick={(event) => onRemoveAnswer(event, i)}
                            />
                          </>
                        )}
                      </Draggable>
                    ) : (
                      <Chip className={classes.selectedAnswerChip} />
                    )}
                  </div>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
          <QuestionButtonBar onForwardClick={onForwardClick} onBackClick={onBackClick} />
        </div>
        <Droppable droppableId="possibleAnswers" isDropDisabled>
          {(provided) => (
            <div className={`${classes.container} ${classes.answerOptions}`} {...provided.droppableProps} ref={provided.innerRef}>
              {answers.map((a, index) => (
                <div key={a.id} className={classes.possibleAnswerContainer}>
                  <Typography className={classes.listEqualsChar}>=</Typography>
                  <Draggable
                    key={a.id}
                    draggableId={"draggable" + a.id}
                    index={index}
                    isDragDisabled={userAnswer.map((c) => c.id).includes(a.id)}
                  >
                    {(provided) => {
                      return (
                        <Chip
                          label={a.text}
                          className={classes.possibleAnswerChip}
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          disabled={userAnswer.map((c) => c.id).includes(a.id)}
                          onClick={() => handleClickChip(index)}
                        />
                      );
                    }}
                  </Draggable>
                </div>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </div>
    </DragDropContext>
  );
}
