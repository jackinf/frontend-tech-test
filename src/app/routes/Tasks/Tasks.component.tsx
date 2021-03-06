import * as React from 'react';
import {TasksReduxState} from "./Tasks.reducer";
import {BootstrapTable, Options, SortOrder, TableHeaderColumn} from 'react-bootstrap-table';
import * as Rx from 'rxjs/Rx';
import { Subject } from 'rxjs/Subject';
import { Subscription } from 'rxjs/Subscription';
import {Modal, ModalHeader, ModalBody, ModalFooter, Form, FormGroup, Input} from 'reactstrap';
import {Button, Container, Header, Label} from "semantic-ui-react";

import CommonUtilities from '../../../helpers/CommonUtilities';
import TasksResponseViewModel from "./viewModels/TasksResponseViewModel";
import TaskForm from './Tasks.form.container';
import TaskSearchOptions from "./viewModels/TaskSearchOptions";

export interface TasksComponentStateProps extends TasksReduxState {}
export interface TasksComponentDispatchProps {
    fetch: Function;

    createCancel: Function;
    createStart: Function;
    createSubmit: Function;

    updateCancel: Function;
    updateStart: Function;
    updateSubmit: Function;

    deleteCancel: Function;
    deleteStart: Function;
    deleteSubmit: Function;
}

function safe(key: keyof TasksResponseViewModel) {
    return CommonUtilities.typeSafeName<TasksResponseViewModel>(key);
}

interface TasksComponentState {searchOptions: TaskSearchOptions};
type TasksComponentProps = TasksComponentStateProps & TasksComponentDispatchProps;

class TasksComponent extends React.Component<TasksComponentProps, TasksComponentState> {
    subscription: Subscription;
    onSearch$: Subject<{}>;

    readonly state: TasksComponentState = { searchOptions: TaskSearchOptions.getDefault() };

    constructor(props: any) {
        super(props);
        this.onSearch$ = new Rx.Subject();

        this.getList = this.getList.bind(this);
        this.onChangeSuccess = this.onChangeSuccess.bind(this);
        this.handleSearch = this.handleSearch.bind(this);

        this.handleCreateStart = this.handleCreateStart.bind(this);
        this.handleCreateCancel = this.handleCreateCancel.bind(this);
        this.handleCreateSubmit = this.handleCreateSubmit.bind(this);

        this.handleUpdateStart = this.handleUpdateStart.bind(this);
        this.handleUpdateCancel = this.handleUpdateCancel.bind(this);
        this.handleUpdateSubmit = this.handleUpdateSubmit.bind(this);

        this.handleDeleteStart = this.handleDeleteStart.bind(this);
        this.handleDeleteCancel = this.handleDeleteCancel.bind(this);
        this.handleDeleteSubmit = this.handleDeleteSubmit.bind(this);
        this.actionFormat = this.actionFormat.bind(this);

        this.handleSortChange = this.handleSortChange.bind(this);
        this.handlePageChange = this.handlePageChange.bind(this);
        this.handleSizePerPageList = this.handleSizePerPageList.bind(this);
    }

    render() {
        const { pendingDeleteId, pendingAdd, pendingUpdateId, confirmLoading } = this.props;
        const { data, pagination } = this.props.tableData;
        const { total } = pagination;
        const { page, sizePerPage } = this.state.searchOptions;

        const tableOptions: Options = {
            page: page,
            sizePerPage: sizePerPage,
            sizePerPageList: [ 5, 10, 25 ],

            onSortChange: this.handleSortChange,
            onPageChange: this.handlePageChange,
            onSizePerPageList: this.handleSizePerPageList
        };

        return (
            <div className="test">
                {/* Creating */}
                <Modal isOpen={pendingAdd} toggle={this.handleCreateCancel}>
                    <ModalHeader toggle={this.handleCreateCancel}>Creating</ModalHeader>
                    <ModalBody>
                        <TaskForm />
                    </ModalBody>
                    <ModalFooter>
                        <Button negative={true} onClick={this.handleCreateCancel} content="Cancel" disabled={confirmLoading} />
                        <Button positive={true} onClick={this.handleCreateSubmit} content="Save" disabled={confirmLoading} icon="checkmark"/>
                    </ModalFooter>
                </Modal>

                {/* Updating */}
                <Modal isOpen={!!pendingUpdateId && pendingUpdateId > 0} toggle={this.handleDeleteCancel}>
                    <ModalHeader>Updating</ModalHeader>
                    <ModalBody>
                        <TaskForm />
                    </ModalBody>
                    <ModalFooter>
                        <Button negative={true} onClick={this.handleUpdateCancel} content="Cancel" disabled={confirmLoading} />
                        <Button positive={true} onClick={this.handleUpdateSubmit} content="Save" disabled={confirmLoading} icon="checkmark"/>
                    </ModalFooter>
                </Modal>

                {/* Deleting */}
                <Modal isOpen={!!pendingDeleteId && pendingDeleteId > 0} toggle={this.handleDeleteCancel}>
                    <ModalHeader>Deleting</ModalHeader>
                    <ModalBody>Do you want to delete this</ModalBody>
                    <ModalFooter>
                        <Button negative={true} onClick={this.handleDeleteCancel} content="No" disabled={confirmLoading} />
                        <Button positive={true} onClick={this.handleDeleteSubmit} content="Yes" disabled={confirmLoading} icon="checkmark"/>
                    </ModalFooter>
                </Modal>

                <Container>
                    <Button id="add-new-task" positive={true} onClick={e => this.handleCreateStart()}>Add new task</Button>
                    <Header as="h2">
                        <i className="fa fa-key"/> Tasks &nbsp;
                        <Label as='a' color='teal' tag={true}>{total}</Label>
                    </Header>
                    <Form onSubmit={e => e.preventDefault()}>
                        <FormGroup>
                            <Label htmlFor="search-title">Search by title</Label>
                            <Input type="text" name="title" id="search-title" placeholder="title" onChange={this.handleSearch} />
                        </FormGroup>
                    </Form>
                    <BootstrapTable
                        data={data}
                        version="4"
                        tableContainerClass="table vm no-th-brd pro-of-month table-hover"
                        tableBodyClass="bg-white"
                        bordered={false}
                        pagination={true}
                        remote={true}
                        fetchInfo={{ dataTotalSize: total }}
                        options={tableOptions}
                    >
                        <TableHeaderColumn isKey={true} hidden={true} dataField={safe('id')}>
                            Id
                        </TableHeaderColumn>
                        <TableHeaderColumn dataField={safe('title')} dataSort={true} width="20%">
                            Title
                        </TableHeaderColumn>
                        <TableHeaderColumn dataField={safe('description')} dataSort={true} width="20%">
                            Description
                        </TableHeaderColumn>
                        <TableHeaderColumn dataFormat={this.actionFormat} columnClassName="text-right" width="20%"/>
                    </BootstrapTable>
                </Container>
            </div>
        )
    }

    componentDidMount(): void {
        this.getList();

        this.subscription = this.onSearch$
            .debounceTime(300)
            .subscribe(() => this.getList());
    }

    componentWillUnmount() {
        if (this.subscription) {
            this.subscription.unsubscribe(); // avoid leaking
        }
    }

    getList(): void { this.props.fetch(this.state.searchOptions); }
    onChangeSuccess(): void { this.getList(); }
    handleSearch(e: any) {
        const searchOptions = this.state.searchOptions;
        searchOptions.title = e.target.value;
        this.setState({searchOptions});

        this.onSearch$.next()
    }

    handleCreateStart(): void  { this.props.createStart(); };
    handleCreateCancel(): void  { this.props.createCancel(); };
    handleCreateSubmit(): void  { this.props.createSubmit(this.onChangeSuccess); };

    handleUpdateStart(id: number): void  { this.props.updateStart(id); };
    handleUpdateCancel(): void  { this.props.updateCancel(); };
    handleUpdateSubmit(): void  { this.props.updateSubmit(this.onChangeSuccess); };

    handleDeleteStart(id: number): void  { this.props.deleteStart(id); };
    handleDeleteCancel(): void  { this.props.deleteCancel(); };
    handleDeleteSubmit(): void  { this.props.deleteSubmit(this.onChangeSuccess); };

    actionFormat(cell: any, row: any): JSX.Element {
        return (
            <div>
                <div className="d-none d-sm-block">
                    <Button.Group>
                        <Button primary={true} onClick={e => this.handleUpdateStart(row.id)}>Update</Button>
                        <Button.Or />
                        <Button negative={true} onClick={e => this.handleDeleteStart(row.id)}>Delete</Button>
                    </Button.Group>
                </div>
                <div className="d-block d-sm-none">
                    <Button.Group basic size="small" >
                        <Button icon="edit" onClick={e => this.handleUpdateStart(row.id)} />
                        <Button icon="delete" onClick={e => this.handleDeleteStart(row.id)} />
                    </Button.Group>
                </div>
            </div>

        );
    }

    handleSortChange(sortName: any, sortOrder: SortOrder) {
        const searchOptions = this.state.searchOptions;
        searchOptions.sortName = sortName;
        searchOptions.sortOrder = sortOrder;
        this.setState({searchOptions});

        this.onSearch$.next()
    }

    handlePageChange(page: number, sizePerPage: number) {
        const searchOptions = this.state.searchOptions;
        searchOptions.page = page;
        searchOptions.sizePerPage = sizePerPage;
        this.setState({searchOptions});

        this.onSearch$.next()
    }

    handleSizePerPageList(sizePerPage: number) {
        const searchOptions = this.state.searchOptions;
        searchOptions.sizePerPage = sizePerPage;
        this.setState({searchOptions});

        this.onSearch$.next()
    }
}

export default TasksComponent;