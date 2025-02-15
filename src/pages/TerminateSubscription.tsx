/*
 * Copyright 2019-2020 SURF.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

import "pages/TerminateSubscription.scss";

import { EuiPage, EuiPageBody } from "@elastic/eui";
import UserInputFormWizard from "components/inputForms/UserInputFormWizard";
import React from "react";
import { FormattedMessage, WrappedComponentProps, injectIntl } from "react-intl";
import { Redirect, RouteComponentProps, withRouter } from "react-router";
import { setFlash } from "utils/Flash";
import { FormNotCompleteResponse, InputForm, Product, SubscriptionModel } from "utils/types";
import { TARGET_TERMINATE } from "validations/Products";

import ApplicationContext from "../utils/ApplicationContext";

interface IProps extends RouteComponentProps, WrappedComponentProps {
    subscriptionId: string;
}

interface IState {
    product?: Product;
    stepUserInput?: InputForm;
    pid?: string;
}

function getTerminateWorkflow(product: Product) {
    return product.workflows.find((wf) => wf.target === TARGET_TERMINATE)!;
}

class TerminateSubscription extends React.Component<IProps, IState> {
    state: IState = {};

    componentDidMount = () => {
        const { subscriptionId } = this.props;

        this.context.apiClient.subscriptionsDetailWithModel(subscriptionId).then((sub: SubscriptionModel) =>
            this.context.apiClient.productById(sub.product.product_id).then((product: Product) => {
                const terminate_workflow = getTerminateWorkflow(product);
                let promise = this.context.apiClient
                    .startProcess(terminate_workflow.name, [{ subscription_id: subscriptionId }])
                    .then((res: { id: string }) => {
                        this.setState({ pid: res.id, product: product });
                    });
                // @ts-ignore
                this.context.apiClient.catchErrorStatus<FormNotCompleteResponse>(promise, 510, (json) => {
                    this.setState({ stepUserInput: json.form, product: product });
                });
            })
        );
    };

    cancel = () => {
        this.props.history.push("/subscriptions/" + this.props.subscriptionId);
    };

    submit = (processInput: {}[]) => {
        const { subscriptionId } = this.props;
        const { product } = this.state;
        const terminate_workflow = getTerminateWorkflow(product!);

        return this.context.apiClient
            .startProcess(terminate_workflow.name, [{ subscription_id: subscriptionId }, ...processInput])
            .then((res: { id: string }) => {
                this.setState({ pid: res.id });
            });
    };

    render() {
        const { subscriptionId, intl } = this.props;
        const { stepUserInput, product, pid } = this.state;

        if (!product) {
            return null;
        }

        const terminate_workflow = getTerminateWorkflow(product);

        if (pid) {
            setFlash(
                intl.formatMessage(
                    { id: "process.flash.create_modify" },
                    {
                        name: intl.formatMessage({ id: `workflow.${terminate_workflow.name}` }),
                        subscriptionId: subscriptionId,
                        pid: pid,
                    }
                )
            );
            return <Redirect to={`/processes?highlight=${pid}`} />;
        }

        if (!stepUserInput) {
            return null;
        }

        return (
            <EuiPage>
                <EuiPageBody component="div" className="mod-terminate-subscription">
                    <section className="card">
                        <h1>
                            <FormattedMessage id="subscription.terminate" />
                        </h1>

                        <UserInputFormWizard
                            stepUserInput={stepUserInput}
                            validSubmit={this.submit}
                            cancel={this.cancel}
                            hasNext={false}
                        />
                    </section>
                </EuiPageBody>
            </EuiPage>
        );
    }
}
TerminateSubscription.contextType = ApplicationContext;

export default injectIntl(withRouter(TerminateSubscription));
