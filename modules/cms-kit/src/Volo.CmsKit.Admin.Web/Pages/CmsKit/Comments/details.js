$(function (){
    var l = abp.localization.getResource("CmsKit");
    
    var commentsService = volo.cmsKit.admin.comments.commentAdmin;

    var commentRequireApprovement = abp.setting.getBoolean("CmsKit.Comments.RequireApprovement");

    if (commentRequireApprovement) {
        $('#IsApprovedSelectInput').show();
    }
    
    var getFormattedDate = function ($datePicker) {
        return $datePicker.data('date');
    };

	moment.localeData().preparse = (s)=>s;
    moment.localeData().postformat = (s)=>s;
	
    $('.singledatepicker').daterangepicker({
        "singleDatePicker": true,
        "showDropdowns": true,
        "autoUpdateInput": false,
        "autoApply": true,
        "opens": "center",
        "drops": "auto",
        "minYear": 1901,
        "maxYear": 2199,
    });

    $('.singledatepicker').attr('autocomplete', 'off');

    $('.singledatepicker').on('apply.daterangepicker', function (ev, picker) {
        $(this).val(picker.startDate.format('l'));
        $(this).data('date', picker.startDate.locale('en').format('YYYY-MM-DD'));
    });
    
    var filterForm = $('#CmsKitCommentsFilterForm');

    var getFilter = function () {
        var filterObj = filterForm.serializeFormToObject();

        filterObj.creationStartDate = getFormattedDate($('#creationStartDate'));
        filterObj.creationEndDate = getFormattedDate($('#creationEndDate'));
        
        return filterObj;
    };
    
    var _dataTable = $('#CommentsTable').DataTable(abp.libs.datatables.normalizeConfiguration({
        processing: true,
        serverSide: true,
        paging: true,
        scrollX: true,
        searching: false,
        scrollCollapse: true,
        ajax: abp.libs.datatables.createAjax(commentsService.getList, getFilter),
        columnDefs: [
            {
                width: "10%",
                title: l("Actions"),
                targets: 0,
                orderable: false,
                rowAction: {
                    items: [
                        {
                            text: l('Details'),
                            action: function (data) {
                                window.location = abp.appPath + 'CmsKit/Comments/Details/' + data.record.id;
                            }
                        },
                        {
                            text: l('Delete'),
                            visible: abp.auth.isGranted('CmsKit.Comments.Delete'),
                            confirmMessage: function (data) {
                                return l("CommentDeletionConfirmationMessage")
                            },
                            action: function (data) {
                                commentsService
                                    .delete(data.record.id)
                                    .then(function () {
                                        _dataTable.ajax.reloadEx();
                                        abp.notify.success(l('DeletedSuccessfully'));
                                    });
                            }
                        },
                        {
                            text: function (data) {
                                return data.isApproved ? l('Disapproved') : l('Approve');
                            },
                            visible: commentRequireApprovement,
                            action: function (data) {
                                var newApprovalStatus = !data.record?.isApproved;

                                commentsService
                                    .updateApprovalStatus(data.record.id, { IsApproved: newApprovalStatus })
                                    .then(function () {
                                        _dataTable.ajax.reloadEx();
                                        var message = newApprovalStatus ? l('ApprovedSuccessfully') : l('ApprovalRevokedSuccessfully');
                                        abp.notify.success(message);
                                    })
                            }
                        },
                        {
                            text: function (data) {
                                if (data.isApproved == null) {
                                    return l('Disapproved')
                                }
                            },
                            visible: commentRequireApprovement,
                            action: function (data) {
                                var newApprovalStatus = false;

                                commentsService
                                    .updateApprovalStatus(data.record.id, { IsApproved: newApprovalStatus })
                                    .then(function () {
                                        _dataTable.ajax.reloadEx();
                                        var message = newApprovalStatus ? l('ApprovedSuccessfully') : l('ApprovalRevokedSuccessfully');
                                        abp.notify.success(message);
                                    })
                            }
                        }
                    ]
                }
            },
            {
                width: "10%",
                title: l("Username"),
                orderable: false,
                data: "author.userName",
                render: function (data) {
                    if (data !== null) {
                        return GetFilterableDatatableContent('#Author', $.fn.dataTable.render.text().display(data)); //prevent against possible XSS
                    }
                    return "";
                }
            },
            {
                title: l("Text"),
                data: "text",
                orderable: false,
                render: function (data) {
                    data = $.fn.dataTable.render.text().display(data || "");

                    var maxChars = 64;

                    if (data.length > maxChars) {
                        return (
                            '<span data-toggle="tooltip" title="' +
                            data +
                            '">' +
                            data.substring(0, maxChars) +
                            "..." +
                            "</span>"
                        );
                    } else {
                        return data;
                    }
                }
            },
            {
                width: "15%",
                title: l("CreationTime"),
                data: "creationTime",
                orderable: true,
                dataFormat: "datetime"
            },
            {
                width: "10%",
                title: l("ApproveState"),
                visible: commentRequireApprovement,
                orderable: false,
                data: "isApproved",
                render: function (data, type, row) {
                    var icons = ''

                    if (data === null) {
                        icons = '<i class="fa-solid fa-hourglass-half text-muted"></i>';
                    } else if (typeof data === "boolean") {
                        if (data) {
                            icons = '<i class="fa-solid fa-check text-success"></i>';
                        } else {
                            icons = '<i class="fa-solid fa-x text-danger"></i>';
                        }
                    }

                    return icons;
                }
            }
        ]
    }));
    
    function GetFilterableDatatableContent(filterSelector, data){
        return '<span class="datatableCell" data-field="'+ filterSelector +'" data-val="'+ data +'">' + data + '</span>';
    }
    
    $(document).on('click', '.datatableCell', function () {
        var inputSelector = $(this).attr('data-field');
        var value = $(this).attr('data-val');
        
        $(inputSelector).val(value);
        
        _dataTable.ajax.reloadEx();
    });
        
    filterForm.submit(function (e){
        e.preventDefault();
        _dataTable.ajax.reloadEx();
    });
});