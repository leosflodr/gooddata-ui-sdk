// (C) 2020 GoodData Corporation
import React from "react";

import { IDashboardInsightProps } from "../types";
import { DefaultDashboardInsightWithDrillableItems } from "./DefaultDashboardInsightWithDrillableItems";
import { DefaultDashboardInsightWithDrillDialog } from "./DefaultDashboardInsightWithDrillDialog";
import { DashboardInsightPropsProvider, useDashboardInsightProps } from "../DashboardInsightPropsContext";

/**
 * @internal
 */
export const DefaultDashboardInsightInner = (): JSX.Element => {
    const props = useDashboardInsightProps();

    return props.drillableItems?.length ? (
        <DefaultDashboardInsightWithDrillableItems {...props} />
    ) : (
        <DefaultDashboardInsightWithDrillDialog {...props} />
    );
};

/**
 * @internal
 */
export const DefaultDashboardInsight = (props: IDashboardInsightProps): JSX.Element => {
    return (
        <DashboardInsightPropsProvider {...props}>
            <DefaultDashboardInsightInner />
        </DashboardInsightPropsProvider>
    );
};