// (C) 2022 GoodData Corporation
import React, { useCallback, useEffect } from "react";
import cx from "classnames";
import { useIntl } from "react-intl";
import compact from "lodash/compact";
import noop from "lodash/noop";
import { widgetRef } from "@gooddata/sdk-model";
import { useBackendStrict, useExecutionDataView, useWorkspaceStrict } from "@gooddata/sdk-ui";

import {
    useDashboardSelector,
    useWidgetExecutionsHandler,
    selectEnableWidgetCustomHeight,
    selectSeparators,
    selectDisableKpiDashboardHeadlineUnderline,
    useDashboardDispatch,
    eagerRemoveSectionItem,
    selectWidgetCoordinatesByRef,
    selectFilterContextFilters,
} from "../../../../model";
import { DashboardItemHeadline, DashboardItemKpi } from "../../../presentationComponents";
import { useDashboardComponentsContext } from "../../../dashboardContexts";

import { useWidgetSelection } from "../../common/useWidgetSelection";
import { ConfigurationBubble } from "../../common";
import { KpiConfigurationPanel } from "./KpiConfigurationPanel/KpiConfigurationPanel";
import { getKpiResult, KpiRenderer, useKpiData } from "../common";
import { IDashboardKpiProps } from "../types";

export const EditableDashboardKpi = (props: IDashboardKpiProps) => {
    const {
        kpiWidget,

        backend: customBackend,
        workspace: customWorkspace,

        ErrorComponent: CustomErrorComponent,
        LoadingComponent: CustomLoadingComponent,

        onError,
    } = props;

    const intl = useIntl();
    const { ErrorComponent, LoadingComponent } = useDashboardComponentsContext({
        ErrorComponent: CustomErrorComponent,
        LoadingComponent: CustomLoadingComponent,
    });

    const backend = useBackendStrict(customBackend);
    const workspace = useWorkspaceStrict(customWorkspace);

    const dashboardFilters = useDashboardSelector(selectFilterContextFilters);

    const {
        error: kpiDataError,
        result: kpiDataResult,
        status: kpiDataStatus,
    } = useKpiData({
        kpiWidget,
        backend,
        dashboardFilters,
        workspace,
    });

    const { primaryMeasure, secondaryMeasure, effectiveFilters } = kpiDataResult ?? {};

    const enableCompactSize = useDashboardSelector(selectEnableWidgetCustomHeight);
    const separators = useDashboardSelector(selectSeparators);
    const disableDrillUnderline = useDashboardSelector(selectDisableKpiDashboardHeadlineUnderline);
    const isDrillable = kpiWidget.drills.length > 0;

    const dispatch = useDashboardDispatch();
    const coordinates = useDashboardSelector(selectWidgetCoordinatesByRef(widgetRef(kpiWidget)));
    const onWidgetDelete = useCallback(() => {
        dispatch(eagerRemoveSectionItem(coordinates.sectionIndex, coordinates.itemIndex));
    }, [dispatch, coordinates.sectionIndex, coordinates.itemIndex]);

    const { error, result, status } = useExecutionDataView(
        {
            backend,
            workspace,
            execution:
                kpiDataStatus === "success"
                    ? {
                          seriesBy: compact([primaryMeasure, secondaryMeasure]),
                          filters: effectiveFilters,
                      }
                    : undefined,
        },
        [kpiDataStatus, primaryMeasure, secondaryMeasure, effectiveFilters, backend, workspace],
    );

    const isLoading =
        status === "loading" ||
        status === "pending" ||
        kpiDataStatus === "loading" ||
        kpiDataStatus === "pending";

    const executionsHandler = useWidgetExecutionsHandler(widgetRef(kpiWidget));
    const { isSelectable, isSelected, onSelected } = useWidgetSelection(widgetRef(kpiWidget));

    useEffect(() => {
        if (error) {
            onError?.(error);
            executionsHandler.onError(error);
        }
    }, [error, executionsHandler, onError]);

    return (
        <DashboardItemKpi
            visualizationClassName={cx("s-dashboard-kpi-component", "widget-loaded", "visualization", {
                "kpi-with-pop": kpiWidget.kpi.comparisonType !== "none",
                "content-loading": isLoading,
                "content-loaded": !isLoading,
            })}
            renderBeforeContent={() => {
                if (isSelected) {
                    return (
                        <ConfigurationBubble widget={kpiWidget}>
                            <KpiConfigurationPanel widget={kpiWidget} />
                        </ConfigurationBubble>
                    );
                }
                return null;
            }}
            renderAfterContent={() =>
                isSelected ? (
                    <div
                        className="dash-item-action dash-item-action-delete gd-icon-trash"
                        onClick={onWidgetDelete}
                    />
                ) : null
            }
            renderHeadline={(clientHeight) => (
                <DashboardItemHeadline title={kpiWidget.title} clientHeight={clientHeight} />
            )}
            isSelectable={isSelectable}
            isSelected={isSelected}
            onSelected={onSelected}
        >
            {() => {
                if (kpiDataStatus === "loading" || kpiDataStatus === "pending") {
                    return <LoadingComponent />;
                }

                if (kpiDataStatus === "error") {
                    return <ErrorComponent message={kpiDataError!.message} />;
                }

                return (
                    <KpiRenderer
                        kpi={kpiWidget}
                        kpiResult={getKpiResult(result, primaryMeasure!, secondaryMeasure, separators)}
                        filters={kpiDataResult?.effectiveFilters ?? []}
                        separators={separators}
                        enableCompactSize={enableCompactSize}
                        error={error}
                        errorHelp={intl.formatMessage({ id: "kpi.error.view" })}
                        isLoading={isLoading}
                        // need to pass something so that the underline is shown...
                        onDrill={noop}
                        isDrillable={isDrillable}
                        disableDrillUnderline={disableDrillUnderline}
                    />
                );
            }}
        </DashboardItemKpi>
    );
};