/*
 * Copyright (c) Center for Computational Science, RIKEN All rights reserved.
 * Copyright (c) Research Institute for Information Technology(RIIT), Kyushu University. All rights reserved.
 * See License.txt in the project root for the license information.
 */
import $ from 'jquery';
import Vue from 'vue/dist/vue.esm.js';
import dialogWrapper from './dialogWrapper';
import showMessage from './showMessage';
import 'jquery-ui/themes/base/all.css';
import '../css/jobScript.css';
import '../css/dialog.css';
import { log } from 'util';
import config from './config';
import configToolTip from './configToolTip';
import hpcCenterJson from '../../db/hpcCenter';

$(() => {
  // create socket.io instance
  const socket = io('/jobScript');
  socket.on('showMessage', showMessage);
  const defaultJobScript = {
    id: '',
    templateName: '',
    hpcCenter: '',
    jobScheduler: '',
    jobName: '',
    other: ''
  }

  // create vue.js instance and render
  let vm = new Vue({
    el: '#view',
    data: {
      newJobScriptInfo: Object.assign({}, defaultJobScript),
      mode: 'addJobScript',
      JobScriptList: [],
      selectedJobScriptIndex: -1,
      errorMessage: 'temp',
      selectedHpc: '',
      selectedHpcInfo: [],
      selectboxList: [],
      selectboxInfo: [],
      jobSchedulerSelect: [],
      hpcCenterSelect: []
    },
    methods: {
      toggleSelected: function (i, selectedJobScript) {
        if (this.selectedJobScriptIndex === i) {
          this.selectedJobScriptIndex = -1;
          resetFormArea(this.selectedHpcInfo);
        } else {
          this.selectboxList = [];
          let hpcCenterName = selectedJobScript.hpcCenter;
          let hpcCenterObject = hpcCenterJson[hpcCenterName];
          this.selectedHpcInfo = hpcCenterObject;
          this.selectboxInfo = hpcCenterObject.filter(property => property.type === "select");
          this.selectboxInfo.forEach(function (property) {
            let flattedValue = Object.values(property.list).flat();
            vm.selectboxList.push(flattedValue);
          });
          this.selectedJobScriptIndex = i;
          Object.assign(this.newJobScriptInfo, selectedJobScript);
          this.selectedHpcInfo.forEach(function (property) {
            property.value = selectedJobScript[property.idName];
          });
        }
      },
      onCopyButton: function () {
        this.mode = 'copyJobScript';
        showErrorMessage("hidden");
        if (this.selectedJobScriptIndex === -1) {
          this.errorMessage = 'Please select JobScript Tempalate';
          showErrorMessage("visible");
          return;
        }
        socket.emit('copyJobScript', this.JobScriptList[this.selectedJobScriptIndex].id);
      },
      onRemoveButton: function () {
        this.mode = 'removeJobScript';
        showErrorMessage("hidden");
        if (this.selectedJobScriptIndex === -1) {
          this.errorMessage = 'Please select JobScript Tempalate';
          showErrorMessage("visible");
          return;
        }
        let deleteJobScript = this.JobScriptList[this.selectedJobScriptIndex].id;
        const html = '<p id="deleteJobScriptLabel">Are you sure to completely delete this JobScript Template?</p>';
        const dialogOptions = {
          title: "Delete JobScript Template"
        };
        dialogWrapper('#dialog', html, dialogOptions)
          .done(function () {
            socket.emit('removeJobScript', deleteJobScript);//ジョブスクリプト削除
            vm.selectedJobScriptIndex = -1;
            resetFormArea(vm.selectedHpcInfo);
          });
      },
      onEditAreaOKButton: function () {
        let emitObject = {};
        this.selectedHpcInfo.forEach(function (property) {
          let key = property.idName;
          emitObject[key] = property.value;
        });
        Object.assign(this.newJobScriptInfo, emitObject);
        if (this.selectedJobScriptIndex === -1) {
          this.mode = 'addJobScript';
        } else {
          this.mode = 'updateJobScript';
        }
        socket.emit(this.mode, this.newJobScriptInfo);//ジョブスクリプト追加と更新
        resetFormArea(this.selectedHpcInfo);
      },
      onEditAreaCancelButton: function () {
        this.selectedJobScriptIndex = -1;
        resetFormArea(this.selectedHpcInfo);
      },
      isSelected: function (index) {
        let flag;
        if (this.selectedJobScriptIndex === index) {
          flag = true;
        } else {
          flag = false;
        }
        return flag;
      },
      //html挿入
      insertHpcCenterInfo: function () {
        this.selectboxList = [];
        let hpcCenterName = this.selectedHpc;
        let hpcCenterObject = hpcCenterJson[hpcCenterName];
        this.selectedHpcInfo = hpcCenterObject;
        let jobSchedulerObject = hpcCenterObject.find(property => property.label === "JobScheduler");
        this.newJobScriptInfo.jobScheduler = jobSchedulerObject.value;
        this.selectboxInfo = hpcCenterObject.filter(property => property.type === "select");
        this.selectboxInfo.forEach(function (property) {
          let flattedValue = Object.values(property.list).flat();
          vm.selectboxList.push(flattedValue);
        });
      },
      filteringSelectbox: function (selectNum, value) {
        let updateCandidate = this.selectboxInfo.filter(property => property.selectNum !== selectNum);
        let filteredBox = [];
        updateCandidate.forEach(function (candidate) {
          if (typeof candidate.list[value] !== "undefined") {
            filteredBox = candidate.list[value]
            vm.selectboxList[candidate.selectNum] = filteredBox;
          }
        })
      }
    },
    computed: {
      isDuplicate: function () {
        return this.JobScriptList.some((element) => {
          return element.templateName === this.newJobScriptInfo.templateName &&
            element.id !== this.newJobScriptInfo.id;
        });
      },
      validation: function () {
        return {
          templateName: !isEmpty(this.newJobScriptInfo.templateName)
        }
      },
      hasError: function () {
        return this.isDuplicate || !Object.keys(this.validation).every((key) => {
          return this.validation[key];
        });
      }
    }
  });

  // request JobScript list
  socket.emit('getJobScriptList', true);
  socket.on('jobScriptList', (JobScriptList) => {
    vm.JobScriptList = JobScriptList;
    vm.selecteds = [];
  });

  // get jobScheduler list
  vm.hpcCenterSelect = Object.keys(hpcCenterJson);

  //draw help message
  updateToolTip();

  function resetFormArea(selectedHpcInfo) {
    Object.assign(vm.newJobScriptInfo, defaultJobScript);
    selectedHpcInfo.forEach(function (property) {
      if (property.label !== "JobScheduler") {
        property.value = "";
      }
    });
  }

  function isEmpty(string) {
    return string === '';
  }

  function showErrorMessage(view) {
    $("#errorMessage").css("visibility", view);
  }

  var pos = $("#titleUserName").offset();
  $("#iconImg").css('right', window.innerWidth - pos.left + "px");

  function updateToolTip() {
    configToolTip.toolTipTexts.forEach((v) => {
      if (config.tooltip_lang.lang === "jpn") {
        try {
          $("[id=" + v.key + "]").attr('title', v.jpn);
        } catch (e) {
          console.log(v.key + " is not find");
          // none
        }
      }
    });
    return;
  }
});
