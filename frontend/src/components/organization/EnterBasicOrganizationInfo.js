import React from "react";
import Form from "./../general/Form";
import { IconButton } from "@material-ui/core";
import AddCircleOutlineIcon from "@material-ui/icons/AddCircleOutline";
import { getLocationFields } from "../../../public/lib/locationOperations";

const renderSearchOption = (option) => {
  return (
    <React.Fragment>
      <IconButton>
        <AddCircleOutlineIcon />
      </IconButton>
      {option.name}
    </React.Fragment>
  );
};

export default function EnterBasicOrganizationInfo({
  errorMessage,
  handleSubmit,
  organizationInfo,
  locationInputRef,
  locationOptionsOpen,
  handleSetLocationOptionsOpen,
}) {
  const [parentOrganization, setParentOrganization] = React.useState(null);
  const onUnselect = () => {
    if (parentOrganization) setParentOrganization(null);
  };
  const getOptionLabel = (option) => option.name;
  const fields = [
    {
      required: true,
      label: "Organization name",
      key: "organizationname",
      type: "text",
      value: organizationInfo["name"],
    },
    {
      label: "We are a sub-organization of a larger organization (e.g. local group)",
      key: "hasparentorganization",
      type: "checkbox",
      checked: false,
      value: organizationInfo["hasparentorganization"],
    },
    {
      required: true,
      label: "Parent organization name",
      key: "parentorganizationname",
      type: "autocomplete",
      autoCompleteProps: {
        label: "Search for your parent organization",
        baseUrl: process.env.API_URL + "/api/organizations/?search=",
        onSelect: setParentOrganization,
        renderOption: renderSearchOption,
        getOptionLabel: getOptionLabel,
        helperText: "Type the name of your parent organization.",
        onUnselect: onUnselect,
        filterOut: [],
      },
      onlyShowIfChecked: "hasparentorganization",
      value: organizationInfo["parentorganizationname"],
    },
    ...getLocationFields({
      locationInputRef: locationInputRef,
      locationOptionsOpen: locationOptionsOpen,
      handleSetLocationOptionsOpen: handleSetLocationOptionsOpen,
      values: organizationInfo,
      locationKey: "location",
    }),
    {
      required: true,
      label: `I verify that I am an authorized representative of this organization and have the right to act on its behalf in the creation and management of this page.`,
      key: "verified",
      type: "checkbox",
      value: organizationInfo["verified"],
    },
  ];

  const messages = {
    submitMessage: "Next step",
  };

  return (
    <Form
      fields={fields}
      messages={messages}
      usePercentage={false}
      onSubmit={(event, account) =>
        handleSubmit(event, { ...account, parentOrganization: parentOrganization })
      }
      errorMessage={errorMessage}
    />
  );
}
