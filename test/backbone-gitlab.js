// Generated by CoffeeScript 1.6.3
(function() {
  var GitLab;

  GitLab = function(url, token) {
    var root;
    root = this;
    this.url = url;
    this.token = token;
    this.sync = function(method, model, options) {
      var extendedOptions;
      extendedOptions = void 0;
      extendedOptions = _.extend({
        beforeSend: function(xhr) {
          if (root.token) {
            return xhr.setRequestHeader("PRIVATE-TOKEN", root.token);
          }
        }
      }, options);
      return Backbone.sync(method, model, extendedOptions);
    };
    this.Model = Backbone.Model.extend({
      sync: this.sync
    });
    this.Collection = Backbone.Collection.extend({
      sync: this.sync
    });
    this.User = this.Model.extend({
      backboneClass: "User",
      url: function() {
        return "" + root.url + "/user";
      },
      initialize: function() {
        return this.sshkeys = new root.SSHKeys();
      }
    });
    this.SSHKey = this.Model.extend({
      backboneClass: "SSHKey",
      initialize: function() {
        return this.truncate();
      },
      truncate: function() {
        var key, key_arr, truncated_hash;
        key = this.get('key');
        key_arr = key.split(/\s/);
        if (typeof key_arr === "object" && key_arr.length === 3) {
          truncated_hash = key_arr[1].substr(-20);
          this.set("truncated_key", "..." + truncated_hash + " " + key_arr[2]);
        } else {
          this.set("truncated_key", key);
        }
        return true;
      }
    });
    this.SSHKeys = this.Collection.extend({
      backboneClass: "SSHKeys",
      url: function() {
        return "" + root.url + "/user/keys";
      },
      model: root.SSHKey
    });
    this.Project = this.Model.extend({
      backboneClass: "Project",
      url: function() {
        return "" + root.url + "/projects/" + (this.id || this.escaped_path());
      },
      initialize: function() {
        this.branches = new root.Branches([], {
          project: this
        });
        this.members = new root.Members([], {
          project: this
        });
        this.on("change", this.parsePath);
        return this.parse_path();
      },
      tree: function(path, branch) {
        return new root.Tree([], {
          project: this,
          path: path,
          branch: branch,
          type: 'tree'
        });
      },
      blob: function(path, branch) {
        return new root.Blob({
          file_path: path,
          name: _.last(path.split("/")),
          type: 'blob'
        }, {
          branch: branch,
          project: this
        });
      },
      parse_path: function() {
        var split;
        if (this.get("path_with_namespace")) {
          split = this.get("path_with_namespace").split("/");
          this.set("path", _.last(split));
          return this.set("owner", {
            username: _.first(split)
          });
        }
      },
      escaped_path: function() {
        return this.get("path_with_namespace").replace("/", "%2F");
      }
    });
    this.Projects = this.Collection.extend({
      model: root.Project,
      url: function() {
        return "" + root.url + "/projects";
      }
    });
    this.Branch = this.Model.extend({
      backboneClass: "Branch"
    });
    this.Branches = this.Collection.extend({
      backboneClass: "Branches",
      model: root.Branch,
      url: function() {
        return "" + root.url + "/projects/" + (this.project.escaped_path()) + "/repository/branches";
      },
      initialize: function(models, options) {
        options = options || {};
        if (!options.project) {
          throw "You have to initialize GitLab.Branches with a GitLab.Project model";
        }
        return this.project = options.project;
      }
    });
    this.Member = this.Model.extend({
      backboneClass: "Member"
    });
    this.Members = this.Collection.extend({
      backboneClass: "Members",
      url: function() {
        return "" + root.url + "/projects/" + (this.project.escaped_path()) + "/members";
      },
      initialize: function(models, options) {
        options = options || {};
        if (!options.project) {
          throw "You have to initialize GitLab.Members with a GitLab.Project model";
        }
        return this.project = options.project;
      },
      model: root.Member
    });
    this.Blob = this.Model.extend({
      backboneClass: "Blob",
      initialize: function(data, options) {
        options = options || {};
        if (!options.project) {
          throw "You have to initialize GitLab.Blob with a GitLab.Project model";
        }
        this.project = options.project;
        this.branch = options.branch || "master";
        this.on("sync", function() {
          return this.set("id", "fakeIDtoenablePUT");
        });
        this.on("change", this.parseFilePath);
        return this.parseFilePath();
      },
      parseFilePath: function(model, options) {
        if (this.get("file_path")) {
          return this.set("name", _.last(this.get("file_path").split("/")));
        }
      },
      sync: function(method, model, options) {
        var baseURL, commit_message;
        options = options || {};
        baseURL = "" + root.url + "/projects/" + (this.project.escaped_path()) + "/repository";
        if (method.toLowerCase() === "read") {
          options.url = "" + baseURL + "/blobs/" + this.branch;
        } else {
          options.url = "" + baseURL + "/files";
        }
        if (method.toLowerCase() === "delete") {
          commit_message = this.get('commit_message') || ("Deleted " + (this.get('file_path')));
          options.url = options.url + ("?file_path=" + (this.get('file_path')) + "&branch_name=" + this.branch + "&commit_message='" + commit_message + "'");
        }
        return root.sync.apply(this, arguments);
      },
      toJSON: function(opts) {
        var defaults;
        if (opts == null) {
          opts = {};
        }
        defaults = {
          file_path: this.get("file_path"),
          branch_name: this.branch,
          content: this.get("content"),
          commit_message: this.get("commit_message") || this.defaultCommitMessage()
        };
        return $.extend(true, defaults, opts);
      },
      defaultCommitMessage: function() {
        if (this.isNew()) {
          return "Created " + (this.get("file_path"));
        } else {
          return "Updated " + (this.get("file_path"));
        }
      },
      fetchContent: function(options) {
        return this.fetch(_.extend({
          dataType: "html",
          data: {
            filepath: this.get("file_path")
          }
        }, options));
      },
      parse: function(response, options) {
        if (_.isString(response)) {
          return {
            content: response
          };
        } else {
          return response;
        }
      }
    });
    this.Tree = this.Collection.extend({
      backboneClass: "Tree",
      model: root.Blob,
      url: function() {
        return "" + root.url + "/projects/" + (this.project.escaped_path()) + "/repository/tree";
      },
      initialize: function(models, options) {
        options = options || {};
        if (!options.project) {
          throw "You have to initialize GitLab.Tree with a GitLab.Project model";
        }
        this.project = options.project;
        this.path = options.path;
        this.name = options.path;
        this.branch = options.branch || "master";
        return this.trees = [];
      },
      fetch: function(options) {
        options = options || {};
        options.data = options.data || {};
        if (this.path) {
          options.data.path = this.path;
        }
        options.data.ref_name = this.branch;
        return root.Collection.prototype.fetch.apply(this, [options]);
      },
      parse: function(resp, xhr) {
        var _this = this;
        _(resp).filter(function(obj) {
          return obj.type === "tree";
        }).map(function(obj) {
          return _this.trees.push(_this.project.tree(obj.name, _this.branch));
        });
        return _(resp).filter(function(obj) {
          return obj.type === "blob";
        }).map(function(obj) {
          var full_path;
          full_path = [];
          if (_this.path) {
            full_path.push(_this.path);
          }
          full_path.push(obj.name);
          return _this.project.blob(full_path.join("/"), _this.branch);
        });
      }
    });
    this.user = new this.User();
    this.project = function(full_path) {
      return new this.Project({
        path: full_path.split("/")[1],
        path_with_namespace: full_path
      });
    };
    return this;
  };

  window.GitLab = GitLab;

}).call(this);
